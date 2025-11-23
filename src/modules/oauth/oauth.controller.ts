import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
  Query,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { AuthUser } from 'src/common/decorators/auth-user.decorator';
import { Public } from 'src/common/decorators/public.decorator';
import { JwtPayload } from 'src/common/interfaces/jwt-payload.interface';
import { AuthorizeRequestDto } from './dto/authorize-request.dto';
import { GrantType, TokenRequestDto } from './dto/token-request.dto';
import { RateLimitGuard } from './guards/rate-limit.guard';
import { OAuthService } from './oauth.service';

@ApiTags('OAuth')
@Controller('oauth')
export class OAuthController {
  constructor(private readonly oauthService: OAuthService) {}

  @Get('authorize')
  @Public()
  @UseGuards(new RateLimitGuard(50, 15 * 60 * 1000)) // 50 requests per 15 minutes
  @ApiOperation({ summary: 'OAuth 2.0 Authorization Endpoint (Public)' })
  async authorize(
    @Query() query: AuthorizeRequestDto,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    // Validate client
    const client = await this.oauthService.validateClient(query.client_id);

    // Validate redirect URI
    if (!this.oauthService.validateRedirectUri(client, query.redirect_uri)) {
      throw new BadRequestException('Invalid redirect_uri');
    }

    // Check if user is already authenticated (has valid session/JWT)
    const userId = await this.oauthService.getAuthenticatedUserId(req);

    // If user is not authenticated, return error with instructions
    if (!userId) {
      // Return JSON response that frontend can handle
      // Frontend should redirect to login page with return URL
      return res.status(401).json({
        error: 'unauthorized',
        error_description:
          'User must be authenticated. Please login first and then retry.',
        login_url: `/api/auth/login?redirect=${encodeURIComponent(req.url)}`,
      });
    }

    // Create authorization code
    const scopes = query.scope?.split(' ') || [];
    const code = await this.oauthService.createAuthorizationCode(
      userId,
      query.client_id,
      query.redirect_uri,
      scopes,
      query.code_challenge,
      query.code_challenge_method,
    );

    // Build redirect URL with authorization code
    const redirectUrl = new URL(query.redirect_uri);
    redirectUrl.searchParams.set('code', code);
    if (query.state) {
      redirectUrl.searchParams.set('state', query.state);
    }

    return res.redirect(redirectUrl.toString());
  }

  @Post('token')
  @Public()
  @UseGuards(new RateLimitGuard(100, 15 * 60 * 1000)) // 100 requests per 15 minutes
  @ApiOperation({ summary: 'OAuth 2.0 Token Endpoint' })
  async token(
    @Body() body: TokenRequestDto,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    try {
      if (body.grant_type === GrantType.AUTHORIZATION_CODE) {
        if (!body.code || !body.redirect_uri || !body.client_id) {
          throw new BadRequestException(
            'Missing required parameters: code, redirect_uri, client_id',
          );
        }

        // Validate client
        await this.oauthService.validateClient(
          body.client_id,
          body.client_secret,
        );

        // Exchange code for token
        const tokenResponse = await this.oauthService.exchangeCodeForToken(
          body.code,
          body.client_id,
          body.redirect_uri,
          body.code_verifier,
        );

        // Set OAuth 2.0 required headers
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Cache-Control', 'no-store');
        res.setHeader('Pragma', 'no-cache');

        // Return raw JSON response (not wrapped in ApiResponse)
        return res.status(200).json(tokenResponse);
      }
    } catch (error: unknown) {
      console.error('TOKEN ENDPOINT ERROR:', error);
      if (error instanceof Error) {
        console.error('Error message:', error.message);
      }
      if (
        error &&
        typeof error === 'object' &&
        ('status' in error || 'statusCode' in error)
      ) {
        console.error(
          'Error status:',
          'status' in error ? error.status : error.statusCode,
        );
      }
      throw error;
    }

    if (body.grant_type === GrantType.REFRESH_TOKEN) {
      // Refresh token implementation (optional)
      throw new BadRequestException('Refresh token grant not implemented yet');
    }

    throw new BadRequestException('Unsupported grant_type');
  }

  @Get('userinfo')
  @Public()
  @UseGuards(new RateLimitGuard(200, 15 * 60 * 1000)) // 200 requests per 15 minutes
  @ApiOperation({ summary: 'OAuth 2.0 UserInfo Endpoint' })
  async userinfo(@Req() req: Request) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.error('Missing or invalid authorization header');
      throw new UnauthorizedException(
        'Missing or invalid authorization header',
      );
    }

    const accessToken = authHeader.substring(7);

    try {
      const userInfo = await this.oauthService.getUserInfo(accessToken);

      return userInfo;
    } catch (error: unknown) {
      console.error('USERINFO ERROR:', error);
      if (error instanceof Error) {
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
      }
      throw error;
    }
  }

  @Get('authorize-authenticated')
  @ApiOperation({
    summary: 'OAuth 2.0 Authorization Endpoint for already authenticated users',
  })
  async authorizeAuthenticated(
    @Query() query: AuthorizeRequestDto,
    @AuthUser() user: JwtPayload,
    @Res() res: Response,
  ) {
    // Validate client
    const client = await this.oauthService.validateClient(query.client_id);

    // Validate redirect URI
    if (!this.oauthService.validateRedirectUri(client, query.redirect_uri)) {
      throw new BadRequestException('Invalid redirect_uri');
    }

    // Create authorization code
    const scopes = query.scope?.split(' ') || [];
    const code = await this.oauthService.createAuthorizationCode(
      user.sub,
      query.client_id,
      query.redirect_uri,
      scopes,
      query.code_challenge,
      query.code_challenge_method,
    );

    // Build redirect URL with authorization code
    const redirectUrl = new URL(query.redirect_uri);
    redirectUrl.searchParams.set('code', code);
    if (query.state) {
      redirectUrl.searchParams.set('state', query.state);
    }

    return res.redirect(redirectUrl.toString());
  }

  @Get('config')
  @Public()
  @UseGuards(new RateLimitGuard(50, 15 * 60 * 1000))
  @ApiOperation({
    summary: 'Get OAuth configuration parameters for frontend',
  })
  async getOAuthConfig(@Req() req: Request) {
    try {
      // Get first active OAuth client (only one client exists)
      const client = await this.oauthService.getDefaultClient();

      if (!client) {
        throw new BadRequestException(
          'No active OAuth client found. Please create an OAuth client first.',
        );
      }

      // Get base URL from request or environment
      const protocol = req.protocol || 'http';
      const host = req.get('host') || 'localhost:3000';
      const baseUrl = `${protocol}://${host}`;

      // Use first redirect URI as default
      const redirectUri =
        client.redirectUris && client.redirectUris.length > 0
          ? client.redirectUris[0]
          : 'https://forum.sadhanaprep.com/oauth2/complete/';

      return {
        redirect_uri: redirectUri,
        response_type: 'code',
        scope: 'openid profile email',
        authorize_endpoint: `${baseUrl}/api/oauth/authorize-with-token`,
        all_redirect_uris: client.redirectUris,
      };
    } catch (error) {
      console.error('OAuth config error:', error);
      throw error;
    }
  }

  @Get('authorize-with-token')
  @Public()
  @UseGuards(new RateLimitGuard(50, 15 * 60 * 1000))
  @ApiOperation({
    summary:
      'OAuth 2.0 Authorization Endpoint with token in query (for frontend redirects)',
  })
  async authorizeWithToken(
    @Query('token') token: string,
    @Query()
    query: Omit<
      AuthorizeRequestDto,
      'client_id' | 'response_type' | 'redirect_uri'
    > & {
      client_id: string;
      response_type: string;
      redirect_uri: string;
    },
    @Res() res: Response,
  ) {
    if (!token) {
      return res.status(400).json({
        error: 'invalid_request',
        error_description: 'Token parameter is required',
      });
    }

    // Validate token using the service method
    try {
      // Create a mock request object with the token
      const mockReq = {
        headers: {
          authorization: `Bearer ${token}`,
        },
      };
      const userId = await this.oauthService.getAuthenticatedUserId(mockReq);

      if (!userId) {
        return res.status(401).json({
          error: 'unauthorized',
          error_description: 'Invalid or expired token',
        });
      }

      // Validate client
      const client = await this.oauthService.validateClient(query.client_id);

      // Validate redirect URI
      if (!this.oauthService.validateRedirectUri(client, query.redirect_uri)) {
        throw new BadRequestException('Invalid redirect_uri');
      }

      // Create authorization code
      const scopes = query.scope?.split(' ') || [];
      const code = await this.oauthService.createAuthorizationCode(
        userId,
        query.client_id,
        query.redirect_uri,
        scopes,
        query.code_challenge,
        query.code_challenge_method,
      );

      // Build redirect URL with authorization code
      const redirectUrl = new URL(query.redirect_uri);
      redirectUrl.searchParams.set('code', code);
      if (query.state) {
        redirectUrl.searchParams.set('state', query.state);
      }

      return res.redirect(redirectUrl.toString());
    } catch (error) {
      console.error('OAuth authorize-with-token error:', error);
      return res.status(401).json({
        error: 'unauthorized',
        error_description: 'Invalid or expired oauth token',
      });
    }
  }
}

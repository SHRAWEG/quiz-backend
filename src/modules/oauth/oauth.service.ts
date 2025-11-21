import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import * as crypto from 'crypto';
import { Repository } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { UsersService } from '../users/users.service';
import { OAuthAuthorizationCode } from './entities/oauth-authorization-code.entity';
import { OAuthClient } from './entities/oauth-client.entity';
import { UserOAuthId } from './entities/user-oauth-id.entity';

export interface OAuthTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token?: string;
  scope?: string;
}

export interface OAuthUserInfo {
  id: number;
  email: string;
  username: string;
  is_active: boolean;
  avatar: string;
}

@Injectable()
export class OAuthService {
  constructor(
    @InjectRepository(OAuthClient)
    private readonly oauthClientRepo: Repository<OAuthClient>,
    @InjectRepository(OAuthAuthorizationCode)
    private readonly authCodeRepo: Repository<OAuthAuthorizationCode>,
    @InjectRepository(UserOAuthId)
    private readonly userOAuthIdRepo: Repository<UserOAuthId>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Validates an OAuth client by client_id and optionally client_secret
   */
  async validateClient(
    clientId: string,
    clientSecret?: string,
  ): Promise<OAuthClient> {
    const client = await this.oauthClientRepo.findOne({
      where: { clientId, isActive: true },
    });

    if (!client) {
      throw new UnauthorizedException('Invalid client_id');
    }

    if (clientSecret && client.clientSecret !== clientSecret) {
      throw new UnauthorizedException('Invalid client_secret');
    }

    return client;
  }

  /**
   * Validates redirect URI against client's allowed redirect URIs
   */
  validateRedirectUri(client: OAuthClient, redirectUri: string): boolean {
    return client.redirectUris.includes(redirectUri);
  }

  /**
   * Generates a secure authorization code
   */
  private generateAuthorizationCode(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Creates an authorization code for the OAuth flow
   */
  async createAuthorizationCode(
    userId: string,
    clientId: string,
    redirectUri: string,
    scopes?: string[],
    codeChallenge?: string,
    codeChallengeMethod?: string,
  ): Promise<string> {
    const code = this.generateAuthorizationCode();
    const expiresIn = this.configService.get<number>(
      'OAUTH_AUTHORIZATION_CODE_EXPIRY',
      600,
    ); // Default 10 minutes

    const authCode = this.authCodeRepo.create({
      code,
      userId,
      clientId,
      redirectUri,
      scopes,
      codeChallenge,
      codeChallengeMethod,
      expiresAt: new Date(Date.now() + expiresIn * 1000),
      used: false,
    });

    await this.authCodeRepo.save(authCode);
    return code;
  }

  /**
   * Validates and exchanges authorization code for access token
   */
  async exchangeCodeForToken(
    code: string,
    clientId: string,
    redirectUri: string,
    codeVerifier?: string,
  ): Promise<OAuthTokenResponse> {
    const authCode = await this.authCodeRepo.findOne({
      where: { code, used: false },
    });

    if (!authCode) {
      throw new UnauthorizedException('Invalid authorization code');
    }

    if (authCode.expiresAt < new Date()) {
      throw new UnauthorizedException('Authorization code has expired');
    }

    if (authCode.clientId !== clientId) {
      throw new UnauthorizedException('Invalid client_id');
    }

    if (authCode.redirectUri !== redirectUri) {
      throw new UnauthorizedException('Invalid redirect_uri');
    }

    // Validate PKCE if code challenge was provided
    if (authCode.codeChallenge) {
      if (!codeVerifier) {
        throw new BadRequestException('code_verifier is required');
      }

      const isValid = this.validatePKCE(
        codeVerifier,
        authCode.codeChallenge,
        authCode.codeChallengeMethod || 'plain',
      );

      if (!isValid) {
        throw new UnauthorizedException('Invalid code_verifier');
      }
    }

    // Mark code as used
    authCode.used = true;
    await this.authCodeRepo.save(authCode);

    // Get or create OAuth ID for user
    const oauthId = await this.getOrCreateOAuthId(authCode.userId);

    // Generate access token
    const accessTokenPayload = {
      sub: authCode.userId,
      oauthId: oauthId.oauthId,
      clientId: authCode.clientId,
      scopes: authCode.scopes || [],
    };

    const accessTokenExpiry = this.configService.get<number>(
      'OAUTH_ACCESS_TOKEN_EXPIRY',
      3600,
    ); // Default 1 hour

    const accessToken = await this.jwtService.signAsync(accessTokenPayload, {
      expiresIn: accessTokenExpiry,
    });

    // Generate refresh token (optional)
    const refreshToken = this.generateRefreshToken();

    return {
      access_token: accessToken,
      token_type: 'Bearer',
      expires_in: accessTokenExpiry,
      refresh_token: refreshToken,
      scope: authCode.scopes?.join(' ') || '',
    };
  }

  /**
   * Validates PKCE code verifier against code challenge
   */
  private validatePKCE(
    codeVerifier: string,
    codeChallenge: string,
    method: string,
  ): boolean {
    if (method === 'plain') {
      return codeVerifier === codeChallenge;
    }

    if (method === 'S256') {
      const hash = crypto
        .createHash('sha256')
        .update(codeVerifier)
        .digest('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '');
      return hash === codeChallenge;
    }

    return false;
  }

  /**
   * Generates a refresh token
   */
  private generateRefreshToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Gets or creates an OAuth ID (integer) for a user (UUID)
   */
  async getOrCreateOAuthId(userId: string): Promise<UserOAuthId> {
    let oauthId = await this.userOAuthIdRepo.findOne({
      where: { userId },
    });

    if (!oauthId) {
      oauthId = this.userOAuthIdRepo.create({ userId });
      oauthId = await this.userOAuthIdRepo.save(oauthId);
    }

    return oauthId;
  }

  /**
   * Gets user information for OAuth userinfo endpoint
   */
  async getUserInfo(accessToken: string): Promise<OAuthUserInfo> {
    try {
      const payload = await this.jwtService.verifyAsync<{ sub: string }>(
        accessToken,
        {
          secret: this.configService.getOrThrow('JWT_SECRET'),
        },
      );

      if (!payload || typeof payload.sub !== 'string') {
        throw new UnauthorizedException('Invalid access token');
      }

      const user = await this.usersService.findUserById(payload.sub);
      if (!user) {
        throw new NotFoundException('User not found');
      }

      const oauthId = await this.getOrCreateOAuthId(user.id);

      // Generate username from email (or use email as username)
      const username = user.email.split('@')[0];

      return {
        id: oauthId.oauthId,
        email: user.email,
        username: username,
        is_active: user.isActive,
        avatar: `${process.env.API_URL}${user.profilePicture}`,
      };
    } catch {
      throw new UnauthorizedException('Invalid access token');
    }
  }

  /**
   * Creates a new OAuth client
   */
  async createClient(
    name: string,
    redirectUris: string[],
  ): Promise<OAuthClient> {
    const clientId = this.generateClientId();
    const clientSecret = this.generateClientSecret();

    const client = this.oauthClientRepo.create({
      name,
      clientId,
      clientSecret,
      redirectUris,
      isActive: true,
    });

    return await this.oauthClientRepo.save(client);
  }

  /**
   * Generates a secure client ID
   */
  private generateClientId(): string {
    return crypto.randomBytes(16).toString('hex');
  }

  /**
   * Generates a secure client secret
   */
  private generateClientSecret(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Finds a client by client ID
   */
  async findClientByClientId(clientId: string): Promise<OAuthClient | null> {
    return await this.oauthClientRepo.findOne({
      where: { clientId, isActive: true },
    });
  }

  /**
   * Gets the default OAuth client (first active client, or by name if provided)
   */
  async getDefaultClient(clientName?: string): Promise<OAuthClient | null> {
    if (clientName) {
      return await this.oauthClientRepo.findOne({
        where: { name: clientName, isActive: true },
      });
    }

    // Return first active client
    return await this.oauthClientRepo.findOne({
      where: { isActive: true },
      order: { createdAt: 'ASC' },
    });
  }

  /**
   * Extracts authenticated user ID from request (JWT token)
   */
  async getAuthenticatedUserId(req: {
    headers?: { authorization?: string };
  }): Promise<string | null> {
    const authHeader = req.headers?.authorization;
    if (
      !authHeader ||
      typeof authHeader !== 'string' ||
      !authHeader.startsWith('Bearer ')
    ) {
      return null;
    }

    try {
      const token = authHeader.substring(7);

      const payload = await this.jwtService.verifyAsync<{ sub: string }>(
        token,
        {
          secret: this.configService.getOrThrow('JWT_SECRET'),
        },
      );

      if (!payload || typeof payload.sub !== 'string') {
        return null;
      }

      return payload.sub;
    } catch {
      return null;
    }
  }

  /**
   * Seeds OAuth IDs for all existing users who don't have one yet
   * This ensures all users can use SSO immediately
   */
  async seedOAuthIdsForExistingUsers(): Promise<{
    created: number;
    existing: number;
    total: number;
  }> {
    // Get all users
    const users = await this.userRepo.find({
      select: ['id'],
    });

    let created = 0;
    let existing = 0;

    for (const user of users) {
      const existingOAuthId = await this.userOAuthIdRepo.findOne({
        where: { userId: user.id },
      });

      if (!existingOAuthId) {
        const oauthId = this.userOAuthIdRepo.create({ userId: user.id });
        await this.userOAuthIdRepo.save(oauthId);
        created++;
      } else {
        existing++;
      }
    }

    return {
      created,
      existing,
      total: users.length,
    };
  }
}

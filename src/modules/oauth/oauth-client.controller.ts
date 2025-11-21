import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from 'src/common/enums/roles.enum';
import { AuthUser } from 'src/common/decorators/auth-user.decorator';
import { Roles } from 'src/common/decorators/role.decorator';
import { JwtPayload } from 'src/common/interfaces/jwt-payload.interface';
import { AuthGuard } from '../auth/guards/auth.guard';
import { RolesGuard } from '../auth/guards/role.gaurd';
import { CreateOAuthClientDto } from './dto/create-oauth-client.dto';
import { OAuthService } from './oauth.service';

@ApiTags('OAuth Client Management')
@Controller('oauth/clients')
@UseGuards(AuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@ApiBearerAuth()
export class OAuthClientController {
  constructor(private readonly oauthService: OAuthService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new OAuth client' })
  async createClient(
    @Body() createClientDto: CreateOAuthClientDto,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    @AuthUser() _user: JwtPayload,
  ) {
    const client = await this.oauthService.createClient(
      createClientDto.name,
      createClientDto.redirectUris,
    );

    return {
      message: 'OAuth client created successfully',
      data: {
        id: client.id,
        clientId: client.clientId,
        clientSecret: client.clientSecret, // Only shown once
        name: client.name,
        redirectUris: client.redirectUris,
        createdAt: client.createdAt,
      },
    };
  }

  @Get()
  @ApiOperation({ summary: 'List all OAuth clients' })
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  listClients(@AuthUser() _user: JwtPayload) {
    // This would require a service method to list all clients
    // For now, return a message
    return {
      message: 'Client listing endpoint - to be implemented',
    };
  }
}

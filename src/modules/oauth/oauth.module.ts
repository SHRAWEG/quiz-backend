import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../users/entities/user.entity';
import { UsersModule } from '../users/users.module';
import { OAuthAuthorizationCode } from './entities/oauth-authorization-code.entity';
import { OAuthClient } from './entities/oauth-client.entity';
import { UserOAuthId } from './entities/user-oauth-id.entity';
import { OAuthClientController } from './oauth-client.controller';
import { OAuthController } from './oauth.controller';
import { OAuthService } from './oauth.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      OAuthClient,
      OAuthAuthorizationCode,
      UserOAuthId,
      User, // Add User entity for seeding
    ]),
    UsersModule,
  ],
  controllers: [OAuthController, OAuthClientController],
  providers: [OAuthService],
  exports: [OAuthService],
})
export class OAuthModule {}

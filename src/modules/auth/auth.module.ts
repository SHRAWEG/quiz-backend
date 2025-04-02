import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EmailService } from '../email/email.service';
import { Role } from '../roles/entities/role.entity';
import { RolesService } from '../roles/roles.service';
import { UserRole } from '../users/entities/user-role.entity';
import { User } from '../users/entities/user.entity';
import { VerificationToken } from '../users/entities/verification-token.entity';
import { UsersModule } from '../users/users.module';
import { UsersService } from '../users/users.service';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

@Module({
  imports: [TypeOrmModule.forFeature([User, Role, UserRole, VerificationToken]), UsersModule],
  controllers: [AuthController],
  providers: [AuthService, UsersService, RolesService, EmailService],
})
export class AuthModule {}

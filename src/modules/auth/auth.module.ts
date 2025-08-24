import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Category } from '../categories/entities/category.entity';
import { EmailService } from '../email/email.service';
import { PasswordResetToken } from '../users/entities/password-reset-token.entity';
import { User } from '../users/entities/user.entity';
import { VerificationToken } from '../users/entities/verification-token.entity';
import { UsersModule } from '../users/users.module';
import { UsersService } from '../users/users.service';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      Category,
      VerificationToken,
      PasswordResetToken,
    ]),
    UsersModule,
  ],
  controllers: [AuthController],
  providers: [AuthService, UsersService, EmailService],
})
export class AuthModule {}

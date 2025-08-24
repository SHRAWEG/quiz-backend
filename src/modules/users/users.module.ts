import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Category } from '../categories/entities/category.entity';
import { EmailModule } from '../email/email.module';
import { PasswordResetToken } from './entities/password-reset-token.entity';
import { User } from './entities/user.entity';
import { VerificationToken } from './entities/verification-token.entity';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      Category,
      VerificationToken,
      PasswordResetToken,
    ]),
    EmailModule,
  ],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}

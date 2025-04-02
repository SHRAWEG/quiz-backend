import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EmailModule } from '../email/email.module';
import { RolesModule } from '../roles/roles.module';
import { UserRole } from './entities/user-role.entity';
import { User } from './entities/user.entity';
import { VerificationToken } from './entities/verification-token.entity';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, UserRole, VerificationToken]), 
    RolesModule,
    EmailModule
  ],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}

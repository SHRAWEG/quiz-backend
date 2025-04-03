import {
  Module,
  OnModuleInit
} from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './modules/auth/auth.module';
import { EmailService } from './modules/email/email.service';
import { Role } from './modules/roles/entities/role.entity';
import { RolesModule } from './modules/roles/roles.module';
import { RolesService } from './modules/roles/roles.service';
import { UserRole } from './modules/users/entities/user-role.entity';
import { User } from './modules/users/entities/user.entity';
import { VerificationToken } from './modules/users/entities/verification-token.entity';
import { UsersModule } from './modules/users/users.module';
import { UsersService } from './modules/users/users.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Role, User, UserRole, VerificationToken]), // Importing Role and User entities
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    JwtModule.registerAsync({
      global: true,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        global: true,
        secret: config.getOrThrow('JWT_SECRET'),
        signOptions: { expiresIn: '15d' },
      }),
    }),
    DatabaseModule,
    RolesModule,
    UsersModule,
    AuthModule,
  ],
  controllers: [AppController],
  providers: [RolesService, UsersService,EmailService],
  exports: [RolesService, UsersService, EmailService], // Exporting services for use in other modules
})

export class AppModule implements OnModuleInit {
  constructor(
    private readonly rolesService: RolesService,
    private readonly usersService: UsersService,
  ) {}

  async onModuleInit() {
    await this.rolesService.seedRoles();
    await this.usersService.seedAdminUser();
  }
}

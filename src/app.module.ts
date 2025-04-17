import { Module, OnModuleInit } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './modules/auth/auth.module';
import { EmailService } from './modules/email/email.service';
import { Option } from './modules/options/entities/option.entity';
import { OptionsModule } from './modules/options/options.module';
import { Question } from './modules/questions/entities/question.entity';
import { QuestionsModule } from './modules/questions/questions.module';
import { SubSubject } from './modules/sub-subjects/entities/sub-subject.entity';
import { SubSubjectsModule } from './modules/sub-subjects/sub-subjects.module';
import { Subject } from './modules/subjects/entities/subject.entity';
import { SubjectsModule } from './modules/subjects/subjects.module';
import { User } from './modules/users/entities/user.entity';
import { VerificationToken } from './modules/users/entities/verification-token.entity';
import { UsersModule } from './modules/users/users.module';
import { UsersService } from './modules/users/users.service';
import { APP_GUARD } from '@nestjs/core';
import { RolesGuard } from './modules/auth/guards/role.gaurd';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Option,
      Question,
      Subject,
      SubSubject,
      User,
      VerificationToken,
    ]), // Importing Role and User entities
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
    //
    AuthModule,
    //
    OptionsModule,
    QuestionsModule,
    SubjectsModule,
    SubSubjectsModule,
    UsersModule,
  ],
  controllers: [],
  providers: [
    UsersService,
    EmailService,
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
  ],
  exports: [UsersService, EmailService],
})
export class AppModule implements OnModuleInit {
  constructor(private readonly usersService: UsersService) {}

  async onModuleInit() {
    await this.usersService.seedAdminUser();
  }
}

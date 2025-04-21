import { Module, OnModuleInit } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
// ENTITIES
import { Option } from './modules/options/entities/option.entity';
import { Question } from './modules/questions/entities/question.entity';
import { SubSubject } from './modules/sub-subjects/entities/sub-subject.entity';
import { Subject } from './modules/subjects/entities/subject.entity';
import { User } from './modules/users/entities/user.entity';
import { VerificationToken } from './modules/users/entities/verification-token.entity';
// GUARDS
// SERVICES
import { EmailService } from './modules/email/email.service';
import { UsersService } from './modules/users/users.service';
// MODULES
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './modules/auth/auth.module';
import { OptionsModule } from './modules/options/options.module';
import { QuestionSetsModule } from './modules/question-sets/question-sets.module';
import { QuestionsModule } from './modules/questions/questions.module';
import { SubSubjectsModule } from './modules/sub-subjects/sub-subjects.module';
import { SubjectsModule } from './modules/subjects/subjects.module';
import { UsersModule } from './modules/users/users.module';

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
    QuestionSetsModule,
  ],
  controllers: [],
  providers: [UsersService, EmailService],
  exports: [UsersService, EmailService],
})
export class AppModule implements OnModuleInit {
  constructor(private readonly usersService: UsersService) {}

  async onModuleInit() {
    await this.usersService.seedAdminUser();
  }
}

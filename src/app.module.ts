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
import { ScheduleModule } from '@nestjs/schedule';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './modules/auth/auth.module';
import { CategoriesModule } from './modules/categories/category.module';
import { Category } from './modules/categories/entities/category.entity';
import { CreditModule } from './modules/credit/credit.module';
import { CronTaskModule } from './modules/cron-task/cron-task.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { FeedbacksModule } from './modules/feedbacks/feedbacks.module';
import { OptionsModule } from './modules/options/options.module';
import { QuestionAttemptModule } from './modules/question-attempt/question-attempt.module';
import { QuestionSetAttemptModule } from './modules/question-set-attempt/question-set-attempt.module';
import { QuestionSet } from './modules/question-sets/entities/question-set.entity';
import { QuestionSetsModule } from './modules/question-sets/question-sets.module';
import { QuestionStatsModule } from './modules/question-stats/question-stats.module';
import { QuestionsModule } from './modules/questions/questions.module';
import { SubSubjectsModule } from './modules/sub-subjects/sub-subjects.module';
import { SubjectsModule } from './modules/subjects/subjects.module';
import { SubscriptionPlansModule } from './modules/subscription-plans/subscription-plans.module';
import { UserSubscriptionsModule } from './modules/user-subscriptions/user-subscriptions.module';
import { UsersModule } from './modules/users/users.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    TypeOrmModule.forFeature([
      Option,
      Question,
      Subject,
      SubSubject,
      User,
      VerificationToken,
      Category,
      QuestionSet,
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
    CategoriesModule,
    QuestionSetAttemptModule,
    QuestionAttemptModule,
    QuestionStatsModule,
    SubscriptionPlansModule,
    UserSubscriptionsModule,
    CronTaskModule,
    CreditModule,
    DashboardModule,
    FeedbacksModule,
  ],
  controllers: [],
  providers: [UsersService, EmailService],
  exports: [UsersService, EmailService],
})
export class AppModule implements OnModuleInit {
  constructor(private readonly usersService: UsersService) {}

  async onModuleInit() {
    await this.usersService.seedAdmin();
    await this.usersService.seedTeacher();
    await this.usersService.seedStudent();
  }
}

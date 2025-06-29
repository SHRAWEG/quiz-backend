import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { QuestionAttempt } from '../question-attempt/entities/question-attempt.entity';
import { QuestionSet } from '../question-sets/entities/question-set.entity';
import { QuestionStats } from '../question-stats/entities/question-stat.entity';
import { Question } from '../questions/entities/question.entity';
import { SubSubjectsModule } from '../sub-subjects/sub-subjects.module';
import { UserSubscription } from '../user-subscriptions/entities/user-subscription.entity';
import { UsersModule } from '../users/users.module';
import { QuestionSetAttempt } from './entities/question-set-attempt.entity';
import { QuestionSetAttemptController } from './question-set-attempt.controller';
import { QuestionSetAttemptService } from './question-set-attempt.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      QuestionSetAttempt,
      QuestionSet,
      QuestionAttempt,
      Question,
      QuestionStats,
      UserSubscription,
    ]),
    UsersModule,
    SubSubjectsModule,
    // TimeExpiryModule,
  ],
  controllers: [QuestionSetAttemptController],
  providers: [QuestionSetAttemptService],
  exports: [QuestionSetAttemptService],
})
export class QuestionSetAttemptModule {}

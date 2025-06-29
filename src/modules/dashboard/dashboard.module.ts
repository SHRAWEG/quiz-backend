import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { QuestionSetAttempt } from '../question-set-attempt/entities/question-set-attempt.entity';
import { Question } from '../questions/entities/question.entity';
import { SubSubjectsModule } from '../sub-subjects/sub-subjects.module';
import { User } from '../users/entities/user.entity';
import { UsersModule } from '../users/users.module';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Question, QuestionSetAttempt]),
    UsersModule,
    SubSubjectsModule,
    // TimeExpiryModule,
  ],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}

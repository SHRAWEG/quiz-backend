import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { QuestionAttempt } from '../question-attempt/entities/question-attempt.entity';
import { Question } from '../questions/entities/question.entity';
import { SubSubjectsModule } from '../sub-subjects/sub-subjects.module';
import { User } from '../users/entities/user.entity';
import { UsersModule } from '../users/users.module';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Question, QuestionAttempt]),
    UsersModule,
    SubSubjectsModule,
    // TimeExpiryModule,
  ],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}

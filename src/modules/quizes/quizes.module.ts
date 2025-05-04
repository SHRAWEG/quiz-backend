import { Module } from '@nestjs/common';
import { QuestionSetsService } from '../question-sets/question-sets.service';
import { QuizesController } from './quizes.controller';
import { QuizesService } from './quizes.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { QuestionSet } from '../question-sets/entities/question-set.entity';
import { Question } from '../questions/entities/question.entity';

@Module({
  imports: [TypeOrmModule.forFeature([QuestionSet, Question])],
  controllers: [QuizesController],
  providers: [QuizesService, QuestionSetsService],
})
export class QuizesModule {}

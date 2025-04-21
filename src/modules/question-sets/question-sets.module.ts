import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { IdExistsConstraint } from 'src/common/validators/id-exists.validator';
import { Question } from '../questions/entities/question.entity';
import { QuestionSet } from './entities/question-set.entity';
import { QuestionSetsController } from './question-sets.controller';
import { QuestionSetsService } from './question-sets.service';

@Module({
  imports: [TypeOrmModule.forFeature([QuestionSet, Question])],
  controllers: [QuestionSetsController],
  providers: [QuestionSetsService, IdExistsConstraint],
})
export class QuestionSetsModule {}

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Option } from '../options/entities/option.entity';
import { SubSubject } from '../sub-subjects/entities/sub-subject.entity';
import { Subject } from '../subjects/entities/subject.entity';
import { Question } from './entities/question.entity';
import { QuestionsController } from './questions.controller';
import { QuestionsService } from './questions.service';
import { SubSubjectsService } from '../sub-subjects/sub-subjects.service';

@Module({
  imports: [TypeOrmModule.forFeature([Question, Option, SubSubject, Subject])],
  controllers: [QuestionsController],
  providers: [QuestionsService, SubSubjectsService],
  exports: [QuestionsService],
})
export class QuestionsModule {}

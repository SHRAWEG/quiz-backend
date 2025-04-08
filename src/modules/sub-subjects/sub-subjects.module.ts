import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { IdExistsConstraint } from 'src/common/validators/id-exists.validator';
import { Option } from '../options/entities/option.entity';
import { Question } from '../questions/entities/question.entity';
import { QuestionsService } from '../questions/questions.service';
import { Subject } from '../subjects/entities/subject.entity';
import { SubSubject } from './entities/sub-subject.entity';
import { SubSubjectsController } from './sub-subjects.controller';
import { SubSubjectsService } from './sub-subjects.service';
@Module({
  imports: [TypeOrmModule.forFeature([Question, Option, SubSubject, Subject])],
  controllers: [SubSubjectsController],
  providers: [SubSubjectsService, IdExistsConstraint, QuestionsService],
  exports: [SubSubjectsService],
})
export class SubSubjectsModule {}

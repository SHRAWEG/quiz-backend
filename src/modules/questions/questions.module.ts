import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { IsUniqueConstraint } from 'src/common/validators/is-unique.validator';
import { Option } from '../options/entities/option.entity';
import { SubSubject } from '../sub-subjects/entities/sub-subject.entity';
import { SubSubjectsModule } from '../sub-subjects/sub-subjects.module';
import { SubSubjectsService } from '../sub-subjects/sub-subjects.service';
import { Subject } from '../subjects/entities/subject.entity';
import { User } from '../users/entities/user.entity';
import { UsersModule } from '../users/users.module';
import { Question } from './entities/question.entity';
import { QuestionsController } from './questions.controller';
import { QuestionsService } from './questions.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Question, Option, SubSubject, Subject, User]),
    UsersModule,
    SubSubjectsModule,
  ],
  controllers: [QuestionsController],
  providers: [QuestionsService, SubSubjectsService, IsUniqueConstraint],
  exports: [QuestionsService],
})
export class QuestionsModule {}

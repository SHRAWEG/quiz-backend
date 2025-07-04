import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { IdExistsConstraint } from 'src/common/validators/id-exists.validator';
import { Question } from '../questions/entities/question.entity';
import { User } from '../users/entities/user.entity';
import { QuestionSetPurchase } from './entities/question-set-purchase.entity';
import { QuestionSet } from './entities/question-set.entity';
import { QuestionSetsController } from './question-sets.controller';
import { QuestionSetsService } from './question-sets.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      QuestionSet,
      Question,
      User,
      QuestionSetPurchase,
    ]),
  ],
  controllers: [QuestionSetsController],
  providers: [QuestionSetsService, IdExistsConstraint],
})
export class QuestionSetsModule {}

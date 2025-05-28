import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { QuestionSetAttempt } from 'src/modules/question-set-attempt/entities/question-set-attempt.entity';
import { TimeExpiryProcessor } from './time-expiry.processor';
import { TimeExpiryService } from './time-expiry.service';
import { QuestionAttempt } from 'src/modules/question-attempt/entities/question-attempt.entity';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'question-set-timeout',
    }),
    TypeOrmModule.forFeature([QuestionSetAttempt, QuestionAttempt]),
  ],
  providers: [TimeExpiryService, TimeExpiryProcessor],
  exports: [TimeExpiryService],
})
export class TimeExpiryModule {}

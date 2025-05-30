import { Module } from '@nestjs/common';
import { QuestionSetAttemptModule } from '../question-set-attempt/question-set-attempt.module';
import { CronTaskService } from './cron-task.service';

@Module({
  imports: [QuestionSetAttemptModule],
  providers: [CronTaskService],
  exports: [],
})
export class CronTaskModule {}

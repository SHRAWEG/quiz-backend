import { Module } from '@nestjs/common';
import { QuestionStatsService } from './question-stats.service';
import { QuestionStatsController } from './question-stats.controller';

@Module({
  controllers: [QuestionStatsController],
  providers: [QuestionStatsService],
})
export class QuestionStatsModule {}

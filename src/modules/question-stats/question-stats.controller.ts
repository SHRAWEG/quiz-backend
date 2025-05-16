import { Controller } from '@nestjs/common';
import { QuestionStatsService } from './question-stats.service';

@Controller('question-stats')
export class QuestionStatsController {
  constructor(private readonly questionStatsService: QuestionStatsService) {}
}

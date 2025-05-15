import { Controller } from '@nestjs/common';
import { QuestionAttemptService } from './question-attempt.service';

@Controller('question-attempt')
export class QuestionAttemptController {
  constructor(
    private readonly questionAttemptService: QuestionAttemptService,
  ) {}
}

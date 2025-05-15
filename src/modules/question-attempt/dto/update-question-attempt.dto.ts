import { PartialType } from '@nestjs/swagger';
import { CreateQuestionAttemptDto } from './create-question-attempt.dto';

export class UpdateQuestionAttemptDto extends PartialType(
  CreateQuestionAttemptDto,
) {}

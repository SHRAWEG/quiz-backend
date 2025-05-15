import { PartialType } from '@nestjs/swagger';
import { CreateQuestionSetAttemptDto } from './create-question-set-attempt.dto';

export class UpdateQuestionSetAttemptDto extends PartialType(
  CreateQuestionSetAttemptDto,
) {}

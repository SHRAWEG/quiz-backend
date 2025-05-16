import { PartialType } from '@nestjs/swagger';
import { CreateQuestionStatDto } from './create-question-stat.dto';

export class UpdateQuestionStatDto extends PartialType(CreateQuestionStatDto) {}

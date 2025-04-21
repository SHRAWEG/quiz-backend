import { ApiProperty, PartialType } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { CreateQuestionDto } from './create-question.dto';

export class UpdateQuestionDto extends PartialType(CreateQuestionDto) {
  @ApiProperty({ description: 'The question text', example: 'What is 2 + 2?' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  question: string;
}

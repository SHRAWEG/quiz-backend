// create-question.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { CreateOptionDto } from 'src/modules/options/dto/create-option.dto';
import { DifficultyLevel, QuestionType } from '../entities/question.entity';

export class CreateQuestionDto {
  @ApiProperty({ description: 'The question text', example: 'What is 2 + 2?' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  question: string;

  @ApiProperty({
    type: [String],
    description: 'An array of four options',
    minItems: 4,
    maxItems: 4,
  })
  @IsArray()
  @Type(() => CreateOptionDto)
  options: CreateOptionDto[];

  @ApiProperty({ enum: QuestionType, description: 'The type of the question' })
  @IsEnum(QuestionType)
  type: QuestionType;

  @ApiProperty({
    description: 'ID of the sub-subject',
    example: 'sub-subject-uuid-1',
  })
  @IsString()
  @IsNotEmpty()
  @IsUUID()
  subSubjectId: string;

  @ApiProperty({
    enum: DifficultyLevel,
    description: 'The difficulty level of the question',
  })
  @IsEnum(DifficultyLevel)
  difficulty: DifficultyLevel;
}

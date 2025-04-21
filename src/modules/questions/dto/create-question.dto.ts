// create-question.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsString,
  IsUUID,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { OnlyOneCorrectOption } from 'src/common/validators/only-one-correct-option.validator';
import { UniqueOptionsText } from 'src/common/validators/unique-opyions-text.valitaros';
import { CreateOptionDto } from 'src/modules/options/dto/create-option.dto';
import { DifficultyLevel, QuestionType } from '../entities/question.entity';

export class CreateQuestionDto {
  @ApiProperty({ description: 'The question text', example: 'What is 2 + 2?' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  question: string;

  @ApiProperty({
    type: [CreateOptionDto],
    description: 'An array of four options',
    minItems: 4,
    maxItems: 4,
  })
  @IsArray()
  @Type(() => CreateOptionDto)
  @ValidateNested({ each: true })
  @ArrayMinSize(4)
  @ArrayMaxSize(4)
  @OnlyOneCorrectOption({ message: 'There must be exactly one correct option' })
  @UniqueOptionsText({ message: 'Option texts must be unique' })
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

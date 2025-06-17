// src/dtos/question-upload.dto.ts

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { QuestionType } from 'src/common/enums/question.enum';

/**
 * DTO for uploading question data from a CSV file.
 * This DTO is designed to match the columns found in 'question_upload.csv'.
 */
export class UploadQuestionDto {
  @ApiProperty({
    description: 'The main text of the question.',
    example: 'What color is an apple?',
  })
  @IsString()
  @IsNotEmpty()
  question: string;

  @ApiProperty({
    description:
      'The type of the question (e.g., mcq, true-or-false, fill-in-the-blanks).',
    enum: QuestionType,
    example: QuestionType.MCQ,
  })
  @IsString()
  @IsNotEmpty()
  @IsIn(Object.values(QuestionType)) // Validate against defined question types
  type: QuestionType; // Using the enum for stricter type checking

  @ApiProperty({
    description: 'The sub-subject or category the question belongs to.',
    example: 'General Knowledge',
  })
  @IsString()
  @IsNotEmpty()
  subSubject: string;

  @ApiProperty({
    description: 'The difficulty level of the question (e.g., 1 to 5).',
    example: 1,
    minimum: 1,
    maximum: 5,
  })
  @IsNumber()
  @IsInt()
  @Min(1)
  @Max(5)
  @Type(() => Number) // Ensure the value is transformed to a number
  difficulty: number;

  @ApiPropertyOptional({
    description:
      'The first option for multiple-choice questions. Optional for other types.',
    example: 'Red',
  })
  @IsString()
  @IsOptional() // Options are optional based on CSV data for non-MCQ
  option1?: string;

  @ApiPropertyOptional({
    description:
      'The second option for multiple-choice questions. Optional for other types.',
    example: 'Green',
  })
  @IsString()
  @IsOptional()
  option2?: string;

  @ApiPropertyOptional({
    description:
      'The third option for multiple-choice questions. Optional for other types.',
    example: 'Blue',
  })
  @IsString()
  @IsOptional()
  option3?: string;

  @ApiPropertyOptional({
    description:
      'The fourth option for multiple-choice questions. Optional for other types.',
    example: 'Yellow',
  })
  @IsString()
  @IsOptional()
  option4?: string;

  @ApiProperty({
    description: 'The correct answer for the question.',
    example: 'Red',
  })
  @IsString()
  @IsNotEmpty()
  correctAnswer: string;
}

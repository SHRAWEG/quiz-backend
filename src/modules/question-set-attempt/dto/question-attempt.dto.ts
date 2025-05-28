import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, IsUUID } from 'class-validator';

export class AnswerQuestionDto {
  @ApiPropertyOptional({
    description: 'UUID of the selected option (used for MCQ questions)',
    type: 'string',
    format: 'uuid',
    example: '5a6b7c8d-9e0f-4a1b-b2c3-d4e5f6789012',
  })
  @IsUUID()
  questionAttemptId: string;

  @ApiPropertyOptional({
    description: 'UUID of the selected option (used for MCQ questions)',
    type: 'string',
    format: 'uuid',
    example: '5a6b7c8d-9e0f-4a1b-b2c3-d4e5f6789012',
  })
  @IsOptional()
  @IsUUID()
  selectedOptionId?: string;

  @ApiPropertyOptional({
    description: 'Boolean answer (used for true/false questions)',
    type: 'boolean',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  selectedBooleanAnswer?: boolean;

  @ApiPropertyOptional({
    description:
      'Textual answer (used for short/long/fill-in-the-blank questions)',
    type: 'string',
    example: 'The capital of Nepal is Kathmandu.',
  })
  @IsOptional()
  @IsString()
  selectedTextAnswer?: string;
}

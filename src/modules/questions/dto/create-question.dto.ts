// create-question.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsString,
  IsUUID,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { IsUnique } from 'src/common/decorators/is-unique.decorator';
import { DifficultyLevel, QuestionType } from 'src/common/enums/question.enum';
import { ForbidIfNotType } from 'src/common/validators/forbid-if-not-type.decorator';
import { CreateOptionDto } from 'src/modules/options/dto/create-option.dto';

export class CreateQuestionDto {
  @ApiProperty({
    description: 'The question text',
    example: 'What color is an apple?',
  })
  @IsString()
  @IsNotEmpty()
  // @MaxLength(500)
  @IsUnique('questions', 'questionText', {
    message: 'This question already exists',
  })
  questionText: string;

  @ApiProperty({
    type: [CreateOptionDto],
    description: 'An array of four options',
    minItems: 4,
    maxItems: 4,
  })
  @ValidateIf((o: CreateQuestionDto) => o.type === QuestionType.MCQ)
  @IsArray()
  @ArrayMinSize(4)
  @ArrayMaxSize(4)
  @ValidateNested({ each: true })
  @Type(() => CreateOptionDto)
  options?: CreateOptionDto[];

  // True/False (only for trueOrFalse)
  @ApiPropertyOptional({
    description: 'Correct answer (true/false) for True/False questions',
    example: true,
  })
  @ValidateIf((o: CreateQuestionDto) => o.type === QuestionType.TRUE_OR_FALSE)
  @IsBoolean()
  @ForbidIfNotType(QuestionType.TRUE_OR_FALSE)
  correctAnswerBoolean?: boolean;

  // Fill in the blanks (only for fillInTheBlanks)
  @ApiPropertyOptional({
    description: 'Correct text for Fill in the Blanks questions',
    example: 'apple',
  })
  @ValidateIf(
    (o: CreateQuestionDto) => o.type === QuestionType.FILL_IN_THE_BLANKS,
  )
  @IsString()
  @IsNotEmpty()
  @ForbidIfNotType(QuestionType.FILL_IN_THE_BLANKS)
  correctAnswerText?: string;

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

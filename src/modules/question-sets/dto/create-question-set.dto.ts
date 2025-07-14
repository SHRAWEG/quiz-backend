import { ApiProperty } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsPositive,
  IsString,
  IsUUID,
  ValidateIf,
} from 'class-validator';
import { QuestionSetAccessType } from '../entities/question-set.entity';

export class CreateQuestionSetDto {
  @ApiProperty({
    example: 'SLC preparation Set',
  })
  @IsString()
  name: string;

  @ApiProperty({
    example: 'UUID',
  })
  @IsUUID()
  categoryId: string;

  @ApiProperty({
    enum: QuestionSetAccessType,
    default: QuestionSetAccessType.FREE,
  })
  @IsEnum(QuestionSetAccessType)
  accessType: QuestionSetAccessType;

  @ApiProperty({
    example: 30,
    required: false,
  })
  @ValidateIf(
    (o: CreateQuestionSetDto) =>
      o.accessType === QuestionSetAccessType.EXCLUSIVE,
  )
  @IsInt()
  @IsPositive()
  creditCost?: number;

  @ApiProperty()
  @IsBoolean()
  isTimeLimited: boolean;

  @ApiProperty({
    example: 30,
    required: false,
  })
  @ValidateIf((o: CreateQuestionSetDto) => o.isTimeLimited === true)
  @IsInt()
  @IsPositive()
  timeLimitSeconds?: number;
}

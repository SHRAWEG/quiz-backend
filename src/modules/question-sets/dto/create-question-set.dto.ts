import { ApiProperty } from '@nestjs/swagger';
import {
  IsBoolean,
  IsInt,
  IsPositive,
  IsString,
  IsUUID,
  ValidateIf,
} from 'class-validator';

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

  @ApiProperty()
  @IsBoolean()
  isFree: boolean;

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

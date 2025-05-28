import { ApiProperty } from '@nestjs/swagger';
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
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

  @ApiProperty({
    example: 30,
  })
  @IsOptional()
  @IsInt()
  @IsPositive()
  timeLimit: number;

  @ApiProperty()
  @IsBoolean()
  isFree: boolean;
}

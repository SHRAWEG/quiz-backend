import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsNotEmpty, IsString } from 'class-validator';

export class CreateOptionDto {
  @ApiProperty({ description: 'The text of the option', example: 'Option A' })
  @IsString()
  @IsNotEmpty()
  option: string;

  @ApiProperty({ description: 'Whether the option is correct', example: true })
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  @IsNotEmpty()
  isCorrect: boolean;
}

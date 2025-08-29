import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsOptional, IsString, Length, MinLength } from 'class-validator';

export class UpdateProfileDto {
  @ApiPropertyOptional({
    description: 'First name of the user',
    example: 'John',
  })
  @IsString()
  @MinLength(2)
  @IsOptional()
  @Transform(({ value }) => (value as string)?.trim())
  firstName?: string;

  @ApiPropertyOptional({
    description: 'Middle name of the user',
    example: 'Michael',
  })
  @IsString()
  @IsOptional()
  @Transform(({ value }) => (value as string)?.trim())
  middleName?: string;

  @ApiPropertyOptional({
    description: 'Last name of the user',
    example: 'Doe',
  })
  @IsString()
  @MinLength(2)
  @IsOptional()
  @Transform(({ value }) => (value as string)?.trim())
  lastName?: string;

  @ApiPropertyOptional({
    description: 'Phone number of the user',
    example: '1234567890',
  })
  @IsString()
  @Length(10, 10)
  @IsOptional()
  @Transform(({ value }) => (value as string)?.trim())
  phone?: string;
}

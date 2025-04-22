import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
  MinLength,
} from 'class-validator';
import { Role } from 'src/common/enums/roles.enum';

export class CreateUserDto {
  @IsEnum(Role)
  role: Role; // for single role

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  @MinLength(2)
  @Transform(({ value }) => (value as string).trim())
  firstName: string;

  @ApiProperty()
  @IsString()
  @IsOptional()
  @Transform(({ value }) => (value as string)?.trim())
  middleName?: string;

  @ApiProperty()
  @IsString()
  @MinLength(2)
  @Transform(({ value }) => (value as string).trim())
  lastName: string;

  @ApiProperty()
  @IsEmail()
  @IsNotEmpty()
  @Transform(({ value }) => (value as string).trim().toLowerCase())
  email: string;

  @ApiProperty()
  @IsString()
  @Length(10, 10)
  @Transform(({ value }) => (value as string).trim())
  phone: string;

  @ApiProperty()
  @IsString()
  @MinLength(6)
  password: string;

  @ApiProperty()
  @IsString()
  @MinLength(6)
  confirmPassword: string;
}

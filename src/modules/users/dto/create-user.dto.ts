import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
  MinLength,
} from 'class-validator';

export class CreateUserDto {
  @IsNotEmpty()
  roleId: number;

  @IsString()
  @MinLength(2)
  @Transform(({ value }) => (value as string).trim())
  firstName: string;

  @IsString()
  @IsOptional()
  @IsNotEmpty()
  @Transform(({ value }) => (value as string)?.trim())
  middleName?: string;

  @IsString()
  @MinLength(2)
  @Transform(({ value }) => (value as string).trim())
  lastName: string;

  @IsEmail()
  @IsNotEmpty()
  @Transform(({ value }) => (value as string).trim().toLowerCase())
  email: string;

  @IsString()
  @Length(10, 10)
  @Transform(({ value }) => (value as string).trim())
  phone: string;

  @IsString()
  @MinLength(6)
  password: string;
}

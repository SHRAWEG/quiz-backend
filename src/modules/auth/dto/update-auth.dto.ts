import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class LoginDto {
  @ApiProperty({ default: 'admin@quizit.com' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @ApiProperty({ default: 'admin123' })
  @IsNotEmpty()
  password: string;
}

import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  Length,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { Role } from 'src/common/enums/roles.enum';

export class UpdateUserDto {
  @IsEnum(Role)
  @IsOptional()
  role?: Role;

  @ApiPropertyOptional()
  @IsString()
  @MinLength(2)
  @IsOptional()
  @Transform(({ value }) => (value as string)?.trim())
  firstName?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  @Transform(({ value }) => (value as string)?.trim())
  middleName?: string;

  @ApiPropertyOptional()
  @IsString()
  @MinLength(2)
  @IsOptional()
  @Transform(({ value }) => (value as string)?.trim())
  lastName?: string;

  @ApiPropertyOptional()
  @IsEmail()
  @IsOptional()
  @Transform(({ value }) => (value as string)?.trim().toLowerCase())
  email?: string;

  @ApiPropertyOptional()
  @IsString()
  @Length(10, 10)
  @IsOptional()
  @Transform(({ value }) => (value as string)?.trim())
  phone?: string;

  // 🔒 Password Change Fields
  @ApiPropertyOptional({ description: 'Old password for verification' })
  @IsString()
  @MinLength(6)
  @IsOptional()
  oldPassword?: string;

  @ApiPropertyOptional({ description: 'New password' })
  @ValidateIf((o: UpdateUserDto) => o.oldPassword != null)
  @IsString()
  @MinLength(6)
  newPassword?: string;

  @ApiPropertyOptional({ description: 'Confirm new password' })
  @ValidateIf((o: UpdateUserDto) => o.oldPassword != null)
  @IsString()
  @MinLength(6)
  confirmNewPassword?: string;
}

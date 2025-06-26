// set-user-preferences.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsUUID } from 'class-validator';

export class SetUserPreferencesDto {
  @ApiProperty({ type: [String], description: 'Array of category IDs' })
  @IsArray()
  @IsUUID('all', { each: true })
  categoryIds: string[];
}

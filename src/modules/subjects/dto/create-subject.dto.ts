import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty } from 'class-validator';

export class CreateSubjectDto {
  @ApiProperty({
    name: 'name',
    example: 'Mathematics',
  })
  @IsNotEmpty()
  name: string;
}

// dto/create-question-set.dto.ts

import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsString, IsUUID } from 'class-validator';

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

  // @ApiProperty()
  // @IsArray()
  // @IsUUID('all', { each: true })
  // @IdExists(Question, {
  //   message: 'Some questions do not exists or are repeated',
  // })
  // questionIds: string[];

  @ApiProperty()
  @IsBoolean()
  isFree: boolean;
}

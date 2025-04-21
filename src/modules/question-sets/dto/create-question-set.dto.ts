// dto/create-question-set.dto.ts

import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsString, IsUUID } from 'class-validator';
import { IdExists } from 'src/common/decorators/id-exists.decorator';
import { Question } from 'src/modules/questions/entities/question.entity';

export class CreateQuestionSetDto {
  @ApiProperty({
    example: 'SLC preparation Set',
  })
  @IsString()
  name: string;

  @ApiProperty()
  @IsArray()
  @IsUUID('all', { each: true })
  @IdExists(Question, { each: true })
  questionIds: string[];
}

import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class AddQuestionDto {
  @ApiProperty({
    example: 'UUID',
  })
  @IsUUID()
  questionSetId: string;

  @ApiProperty({
    example: 'UUID',
  })
  @IsUUID()
  questionId: string;
}

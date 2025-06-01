import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

export class ReviewAnswerDto {
  @ApiPropertyOptional({
    description: 'Boolean value used to mark if the answer is correct or not)',
    type: 'boolean',
    example: true,
  })
  @IsBoolean()
  isCorrect: boolean;
}

import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class CreateFeedbackDto {
  @ApiProperty({
    description: 'The Feedback text',
    example: 'Anything you feel like sharing to the admins.',
  })
  @IsString()
  @IsNotEmpty()
  feedback: string;
}

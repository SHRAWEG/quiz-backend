import { ApiProperty, PartialType } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';
import { CreateSubSubjectDto } from './create-sub-subject.dto';

export class UpdateSubSubjectDto extends PartialType(CreateSubSubjectDto) {
  @ApiProperty({
    description: 'The name of the sub-subject',
    example: 'Geometry',
  })
  @IsNotEmpty()
  @IsString()
  name?: string;
}

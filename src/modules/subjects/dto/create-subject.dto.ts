import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';
import { IsUnique } from 'src/common/decorators/is-unique.decorator';

export class CreateSubjectDto {
  @ApiProperty({
    name: 'name',
    example: 'Mathematics',
  })
  @IsNotEmpty()
  @IsString()
  @IsUnique('subjects', 'name', {
    message: 'This subject already exists',
  })
  name: string;
}

import { ApiProperty, PartialType } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';
import { CreateCategoryDto } from './create-category.dto';

export class UpdateCategoryDto extends PartialType(CreateCategoryDto) {
  @ApiProperty({
    description: 'The name of the sub-subject',
    example: 'ILETS',
  })
  @IsNotEmpty()
  @IsString()
  name?: string;
}

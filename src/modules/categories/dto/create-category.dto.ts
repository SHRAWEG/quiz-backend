import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';
import { IsUnique } from 'src/common/decorators/is-unique.decorator';

export class CreateCategoryDto {
  @ApiProperty({
    name: 'name',
    example: 'ILETS',
  })
  @IsNotEmpty()
  @IsString()
  @IsUnique('categories', 'name', {
    message: 'This subject already exists',
  })
  name: string;
}

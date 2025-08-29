import { ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';
import { CreateNoticeDto } from './create-notice.dto';

export class UpdateNoticeDto extends PartialType(CreateNoticeDto) {
  @ApiPropertyOptional({
    description: 'Whether the notice is active or not',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

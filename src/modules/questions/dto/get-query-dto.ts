import { ApiPropertyOptional } from '@nestjs/swagger';

export class GetQueryDto {
  @ApiPropertyOptional({
    description: 'Page number (default: 1)',
    type: Number,
  })
  page?: number;

  @ApiPropertyOptional({
    description: 'Number of items per page (default: 10)',
    type: Number,
  })
  limit?: number;

  @ApiPropertyOptional({
    description: 'Term to search for subjects',
    type: String,
  })
  search?: string;

  @ApiPropertyOptional({
    description: 'Subject Id to filter sub-subjects',
    type: String,
  })
  subjectId?: string;

  @ApiPropertyOptional({
    description: 'Sub-subject Id to filter sub-subjects',
    type: String,
  })
  subSubjectId?: string;
}

import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsUUID } from 'class-validator';
import { IdExists } from 'src/common/decorators/id-exists.decorator';
import { Subject } from 'src/modules/subjects/entities/subject.entity';

export class CreateSubSubjectDto {
  @ApiProperty({
    description: 'The name of the sub-subject',
    example: 'Geometry',
  })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiProperty({
    description: 'The id of the subject',
  })
  @IsNotEmpty()
  @IsUUID()
  @IdExists(Subject, {
    message: 'Subject not found',
  })
  subjectId: string;
}

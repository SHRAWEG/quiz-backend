import { PartialType } from '@nestjs/swagger';
import { CreateSubSubjectDto } from './create-sub-subject.dto';

export class UpdateSubSubjectDto extends PartialType(CreateSubSubjectDto) {}

import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiQuery } from '@nestjs/swagger';
import { CreateSubSubjectDto } from './dto/create-sub-subject.dto';
import { UpdateSubSubjectDto } from './dto/update-sub-subject.dto';
import { SubSubjectsService } from './sub-subjects.service';

@Controller('sub-subjects')
export class SubSubjectsController {
  constructor(private readonly subSubjectsService: SubSubjectsService) {}

  @Post()
  create(@Body() createSubSubjectDto: CreateSubSubjectDto) {
    return this.subSubjectsService.create(createSubSubjectDto);
  }

  @Get()
  @ApiQuery({
    name: 'search',
    required: false,
  })
  @ApiQuery({
    name: 'subjectId',
    required: false,
  })
  findAll(
    @Query('search') search?: string,
    @Query('subjectId') subjectId?: string,
  ) {
    return this.subSubjectsService.search(search, subjectId);
  }

  @Get(':id')
  getById(@Param('id') id: string) {
    return this.subSubjectsService.getById(id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateSubSubjectDto: UpdateSubSubjectDto,
  ) {
    return this.subSubjectsService.update(id, updateSubSubjectDto);
  }

  @Delete(':id')
  delete(@Param('id') id: string) {
    return this.subSubjectsService.delete(id);
  }
}

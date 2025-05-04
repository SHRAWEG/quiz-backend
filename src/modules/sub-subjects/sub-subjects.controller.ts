import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { Roles } from 'src/common/decorators/role.decorator';
import { Role } from 'src/common/enums/roles.enum';
import { AuthGuard } from '../auth/guards/auth.guard';
import { RolesGuard } from '../auth/guards/role.gaurd';
import { CreateSubSubjectDto } from './dto/create-sub-subject.dto';
import { UpdateSubSubjectDto } from './dto/update-sub-subject.dto';
import { SubSubjectsService } from './sub-subjects.service';

@Controller('sub-subjects')
@UseGuards(AuthGuard, RolesGuard)
@ApiBearerAuth()
@Roles(Role.ADMIN)
export class SubSubjectsController {
  constructor(private readonly subSubjectsService: SubSubjectsService) {}

  @Post()
  create(@Body() createSubSubjectDto: CreateSubSubjectDto) {
    return this.subSubjectsService.create(createSubSubjectDto);
  }

  @Get()
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number (default: 1)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Number of items per page (default: 10)',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    type: String,
    description: 'Term to search for subjects',
  })
  @ApiQuery({
    name: 'subjectId',
    required: false,
    type: String,
    description: 'Subject Id to filter sub-subjects',
  })
  get(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
    @Query('search') search: string = '',
    @Query('subjectId') subjectId?: string,
  ) {
    const pageNumber = parseInt(page, 10);
    const limitNumber = parseInt(limit, 10);
    return this.subSubjectsService.get(
      pageNumber,
      limitNumber,
      search,
      subjectId,
    );
  }

  @Get('search')
  @Roles(Role.ADMIN, Role.TEACHER)
  @ApiQuery({
    name: 'search',
    required: false,
    type: String,
    description: 'Term to search for subjects',
  })
  @ApiQuery({
    name: 'subjectId',
    required: false,
    type: String,
    description: 'Subject Id to filter sub-subjects',
  })
  search(
    @Query('search') search: string = '',
    @Query('subjectId') subjectId: string = '',
  ) {
    return this.subSubjectsService.search(search, subjectId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.subSubjectsService.getById(id);
  }

  @Put(':id')
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

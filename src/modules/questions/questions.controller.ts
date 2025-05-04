import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
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
import { CreateQuestionDto } from './dto/create-question.dto';
import { UpdateQuestionDto } from './dto/update-question.dto';
import { QuestionStatus } from './entities/question.entity';
import { QuestionsService } from './questions.service';

@Controller('questions')
@UseGuards(AuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@ApiBearerAuth()
export class QuestionsController {
  constructor(private readonly questionService: QuestionsService) {}
  @Post()
  @Roles(Role.ADMIN, Role.TEACHER)
  addQuestion(@Body() createQuestionDto: CreateQuestionDto) {
    return this.questionService.create(createQuestionDto);
  }

  @Get()
  @Roles(Role.ADMIN, Role.TEACHER)
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
    name: 'status',
    required: false,
    type: String,
    description: 'Statuss to filter subjects',
  })
  @ApiQuery({
    name: 'subjectId',
    required: false,
    type: String,
    description: 'Subject Id to filter subjects',
  })
  @ApiQuery({
    name: 'subSubjectId',
    required: false,
    type: String,
    description: 'Sub Subject Id to filter sub-subjects',
  })
  get(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
    @Query('search') search: string = '',
    @Query('status') status: QuestionStatus,
    @Query('subjectId') subjectId?: string,
    @Query('subSubjectId') subSubjectId?: string,
  ) {
    const pageNumber = parseInt(page, 10);
    const limitNumber = parseInt(limit, 10);
    return this.questionService.get(
      pageNumber,
      limitNumber,
      search,
      status,
      subjectId,
      subSubjectId,
    );
  }

  @Get('search')
  @ApiQuery({
    name: 'search',
    required: false,
  })
  @ApiQuery({
    name: 'subjectId',
    required: false,
  })
  @ApiQuery({
    name: 'subSubjectId',
    required: false,
  })
  search(
    @Query('search') search: string = '',
    @Query('subjectId') subjectId: string = '',
    @Query('subSubjectId') subSubjectId: string = '',
  ) {
    return this.questionService.search(search, subjectId, subSubjectId);
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.TEACHER)
  findOne(@Param('id') id: string) {
    return this.questionService.getById(id);
  }

  @Put(':id')
  @Roles(Role.ADMIN, Role.TEACHER)
  update(
    @Param('id') id: string,
    @Body() updateQuestionDto: UpdateQuestionDto,
  ) {
    return this.questionService.update(id, updateQuestionDto);
  }

  @Patch('approve/:id')
  @ApiBearerAuth()
  updateStatus(@Param('id') id: string) {
    return this.questionService.approveQuestion(id);
  }

  @Patch('reject/:id')
  @ApiBearerAuth()
  rejectStatus(@Param('id') id: string) {
    return this.questionService.rejectQuestion(id);
  }

  @Delete(':id')
  @Roles(Role.ADMIN, Role.TEACHER)
  delete(@Param('id') id: string) {
    return this.questionService.delete(id);
  }
}

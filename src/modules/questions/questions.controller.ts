import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { AuthRolesGuard } from '../auth/guards/auth-role.gaurd';
import { CreateQuestionDto } from './dto/create-question.dto';
import { QuestionsService } from './questions.service';
import { UpdateQuestionDto } from './dto/update-question.dto';

@Controller('questions')
export class QuestionsController {
  constructor(private readonly questionService: QuestionsService) {}
  @Post()
  @UseGuards(AuthRolesGuard)
  @ApiBearerAuth()
  async addQuestion(
    @Body() createQuestionDto: CreateQuestionDto,
    @Req() req: Request & { user: { id: string; email: string } },
  ) {
    // Get the whole request object with .user)
    const user = req.user;
    console.log(user);
    return this.questionService.create(createQuestionDto, user.id);
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
    @Query('subjectId') subSubjectId?: string,
  ) {
    const pageNumber = parseInt(page, 10);
    const limitNumber = parseInt(limit, 10);
    return this.questionService.get(
      pageNumber,
      limitNumber,
      search,
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
  findOne(@Param('id') id: string) {
    return this.questionService.getById(id);
  }

  @Put(':id')
  update(
    @Param('id') id: string,
    @Body() updateQuestionDto: UpdateQuestionDto,
  ) {
    return this.questionService.update(id, updateQuestionDto);
  }

  @Delete(':id')
  delete(@Param('id') id: string) {
    return this.questionService.delete(id);
  }
}

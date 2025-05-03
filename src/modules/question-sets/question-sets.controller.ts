// question-set.controller.ts

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
import { AddQuestionDto } from './dto/add-question-dto';
import { CreateQuestionSetDto } from './dto/create-question-set.dto';
import { UpdateQuestionSetDto } from './dto/update-question-set.dto';
import { QuestionSetStatus } from './entities/question-set.entity';
import { QuestionSetsService } from './question-sets.service';

@Controller('question-sets')
@UseGuards(AuthGuard, RolesGuard)
@Roles(Role.Admin)
@ApiBearerAuth()
export class QuestionSetsController {
  constructor(private readonly questionSetService: QuestionSetsService) {}

  @Post()
  create(@Body() dto: CreateQuestionSetDto) {
    return this.questionSetService.create(dto);
  }

  @Post('/add-question')
  addQuestion(@Body() dto: AddQuestionDto) {
    return this.questionSetService.addQuestion(dto);
  }

  @Post('/remove-question')
  removeQuestion(@Body() dto: AddQuestionDto) {
    return this.questionSetService.removeQuestion(dto);
  }

  @Get()
  @Roles(Role.Admin, Role.Teacher)
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
    description: 'Term to filter search Question Sets',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    type: String,
    description: 'Status filter to search Question Sets',
  })
  get(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
    @Query('search') search: string,
    @Query('status') status: QuestionSetStatus,
  ) {
    const pageNumber = parseInt(page, 10);
    const limitNumber = parseInt(limit, 10);
    return this.questionSetService.get(pageNumber, limitNumber, search, status);
  }

  @Get(':id')
  @Roles(Role.Admin, Role.Teacher)
  findOne(@Param('id') id: string) {
    return this.questionSetService.getById(id);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() dto: UpdateQuestionSetDto) {
    return this.questionSetService.update(id, dto);
  }

  @Post('/publish/:id')
  publish(@Param('id') id: string) {
    return this.questionSetService.publish(id);
  }

  @Post('/draft/:id')
  draft(@Param('id') id: string) {
    return this.questionSetService.draft(id);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.questionSetService.delete(id);
  }
}

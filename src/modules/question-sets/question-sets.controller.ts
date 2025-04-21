// question-set.controller.ts

import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { CreateQuestionSetDto } from './dto/create-question-set.dto';
import { QuestionSetsService } from './question-sets.service';

@Controller('question-sets')
export class QuestionSetsController {
  constructor(private readonly questionSetService: QuestionSetsService) {}

  @Post()
  @ApiBearerAuth()
  create(@Body() dto: CreateQuestionSetDto) {
    return this.questionSetService.create(dto);
  }
  @Get()
  findAll() {
    return this.questionSetService.findAll();
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.questionSetService.delete(id);
  }
}

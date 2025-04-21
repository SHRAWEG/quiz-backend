import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { AuthRolesGuard } from '../auth/guards/auth-role.gaurd';
import { CreateQuestionDto } from './dto/create-question.dto';
import { QuestionsService } from './questions.service';

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
}

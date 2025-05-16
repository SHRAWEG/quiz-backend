import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { Roles } from 'src/common/decorators/role.decorator';
import { Role } from 'src/common/enums/roles.enum';
import { AuthGuard } from '../auth/guards/auth.guard';
import { RolesGuard } from '../auth/guards/role.gaurd';
import { AnswerQuestionDto } from './dto/question-attempt.dto';
import { QuestionSetAttemptService } from './question-set-attempt.service';

@Controller('question-set-attempts')
@UseGuards(AuthGuard, RolesGuard)
@Roles(Role.STUDENT)
@ApiBearerAuth()
export class QuestionSetAttemptController {
  constructor(
    private readonly questionSetAttemptService: QuestionSetAttemptService,
  ) {}

  // Start a new quiz attempt
  @Post('/start/:questionSetId/start')
  async startQuestionSetAttempt(@Param('questionSetId') questionSetId: string) {
    return await this.questionSetAttemptService.startQuestionSetAttempt(
      questionSetId,
    );
  }

  // Get Question set Attempt Details.
  @Get()
  async getQuestionSetAttempts() {
    return await this.questionSetAttemptService.getQuestionSetAttempts();
  }

  // Get Question set Attempt Details.
  @Get('/:questionSetAttemptId')
  async getQuestionSetAttempt(
    @Param('questionSetAttemptId') questionSetAttemptId: string,
  ) {
    return await this.questionSetAttemptService.getQuestionSetAttempt(
      questionSetAttemptId,
    );
  }

  // Submit an answer (could be in QuestionAttemptsController ideally)
  @Post('/answer/:questionSetAttemptId/:questionId')
  async answerQuestion(
    @Param('questionSetAttemptId') questionSetAttemptId: string,
    @Param('questionId') questionId: string,
    @Body() body: AnswerQuestionDto,
  ) {
    return await this.questionSetAttemptService.answerQuestion(
      questionSetAttemptId,
      questionId,
      body,
    );
  }

  // Complete the quiz and get the result
  @Put('/:questionSetAttemptId/finish')
  async finishQuiz(
    @Param('questionSetAttemptId') questionSetAttemptId: string,
  ) {
    return this.questionSetAttemptService.finishQuiz(questionSetAttemptId);
  }
}

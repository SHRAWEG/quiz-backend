import { Body, Controller, Param, Post, Put, UseGuards } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { Roles } from 'src/common/decorators/role.decorator';
import { Role } from 'src/common/enums/roles.enum';
import { AuthGuard } from '../auth/guards/auth.guard';
import { RolesGuard } from '../auth/guards/role.gaurd';
import { AnswerQuestionDto } from './dto/question-attempt.dto';
import { QuestionSetAttemptService } from './question-set-attempt.service';

@Controller('question-set-attempt')
@UseGuards(AuthGuard, RolesGuard)
@Roles(Role.STUDENT)
@ApiBearerAuth()
export class QuestionSetAttemptController {
  constructor(
    private readonly questionSetAttemptService: QuestionSetAttemptService,
  ) {}

  // Start a new quiz attempt
  @Post(':questionSetId/start')
  async startQuestionSetAttempt(@Param('questionSetId') questionSetId: string) {
    return await this.questionSetAttemptService.startQuestionSetAttempt(
      questionSetId,
    );
  }

  // Submit an answer (could be in QuestionAttemptsController ideally)
  @Post('answer/:questionSetAttemptId/:questionId')
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
  @Put(':attemptId/finish')
  async finishQuiz(@Param('attemptId') attemptId: string) {
    return this.questionSetAttemptService.finishQuiz(attemptId);
  }
}

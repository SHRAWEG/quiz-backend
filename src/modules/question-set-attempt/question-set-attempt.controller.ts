import {
  Body,
  Controller,
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
import { QuestionAttemptDto } from './dto/question-attempt.dto';
import { ReviewAnswerDto } from './dto/review-answer.dto copy';
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
  @Post('/start/:questionSetId')
  async startQuestionSetAttempt(@Param('questionSetId') questionSetId: string) {
    return await this.questionSetAttemptService.startQuestionSetAttempt(
      questionSetId,
    );
  }

  @Get()
  @Roles(Role.STUDENT)
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
  async getQuestionSetAttempts(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
    @Query('search') search: string = '',
    @Query('status') status: string = '',
  ) {
    const pageNumber = parseInt(page, 10);
    const limitNumber = parseInt(limit, 10);
    return this.questionSetAttemptService.getQuestionSetAttempts(
      pageNumber,
      limitNumber,
      search,
      status,
    );
  }

  @Roles(Role.ADMIN)
  // Get Question set Attempt Details.
  @Get('review')
  async getQuestionSetAttemptsToReview() {
    return await this.questionSetAttemptService.getQuestionSetAttemptsToReview();
  }

  @Roles(Role.ADMIN)
  @Get('review/:questionSetAttemptId')
  async getQuestionSetAttemptToReview(
    @Param('questionSetAttemptId') questionSetAttemptId: string,
  ) {
    return await this.questionSetAttemptService.getQuestionSetAttemptToReviewById(
      questionSetAttemptId,
    );
  }

  // Get Question set Attempt Details.
  @Get('/:questionSetAttemptId')
  async getQuestionSetAttempt(
    @Param('questionSetAttemptId') questionSetAttemptId: string,
  ) {
    return await this.questionSetAttemptService.getQuestionSetAttemptById(
      questionSetAttemptId,
    );
  }

  // Get Question set Attempt Reports if completed.
  @Get('/report/:questionSetAttemptId')
  async getQuestionSetAttemptReport(
    @Param('questionSetAttemptId') questionSetAttemptId: string,
  ) {
    return await this.questionSetAttemptService.getQuestionSetAttemptReportById(
      questionSetAttemptId,
    );
  }

  // Get Question set Attempt Status for time and completion status.
  @Get('/status/:questionSetAttemptId')
  async getQuestionSetAttemptStatus(
    @Param('questionSetAttemptId') questionSetAttemptId: string,
  ) {
    return await this.questionSetAttemptService.getQuestionSetAttemptStatusById(
      questionSetAttemptId,
    );
  }

  // Submit an answer (could be in QuestionAttemptsController ideally)
  @Post('/answer/:questionSetAttemptId')
  async answerQuestion(
    @Param('questionSetAttemptId') questionSetAttemptId: string,
    @Body() body: QuestionAttemptDto,
  ) {
    return await this.questionSetAttemptService.answerQuestion(
      questionSetAttemptId,
      body,
    );
  }

  // Complete the quiz and get the result
  @Put('finish/:questionSetAttemptId')
  async finishQuiz(
    @Param('questionSetAttemptId') questionSetAttemptId: string,
  ) {
    return this.questionSetAttemptService.finishQuiz(questionSetAttemptId);
  }

  // Review the Short/Long types questions answers
  @Roles(Role.ADMIN)
  @Put('reviewAnswer/:questionAttemptId')
  async reviewAnswer(
    @Param('questionAttemptId') questionAttemptId: string,
    @Body() payload: ReviewAnswerDto,
  ) {
    return this.questionSetAttemptService.reviewAnswer(
      questionAttemptId,
      payload,
    );
  }

  @Roles(Role.ADMIN)
  // Mark question set attempt as checked after reviewing all the reviewable answers
  @Put('markChecked/:questionSetAttemptId')
  async markIsChecked(
    @Param('questionSetAttemptId') questionSetAttemptId: string,
  ) {
    return this.questionSetAttemptService.markIsChecked(questionSetAttemptId);
  }
}

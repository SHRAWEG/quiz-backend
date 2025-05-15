import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { InjectRepository } from '@nestjs/typeorm';
import { Request } from 'express';
import { QuestionType } from 'src/common/enums/question.enum';
import { QuestionSetAttempt } from 'src/modules/question-set-attempt/entities/question-set-attempt.entity';
import { QuestionSet } from 'src/modules/question-sets/entities/question-set.entity';
import { Repository } from 'typeorm';
import { QuestionAttempt } from '../question-attempt/entities/question-attempt.entity';
import { Question } from '../questions/entities/question.entity';
import { AnswerQuestionDto } from './dto/question-attempt.dto';

@Injectable()
export class QuestionSetAttemptService {
  constructor(
    @InjectRepository(QuestionSetAttempt)
    private readonly questionSetAttemptsRepository: Repository<QuestionSetAttempt>,
    @InjectRepository(QuestionAttempt)
    private readonly questionAttemptRepository: Repository<QuestionAttempt>,
    @InjectRepository(QuestionSet)
    private readonly questionSetRepository: Repository<QuestionSet>,
    @InjectRepository(Question)
    private readonly questionRepository: Repository<Question>,
    @Inject(REQUEST) private readonly request: Request,
  ) {}

  async startQuestionSetAttempt(questionSetId: string) {
    const user = this.request.user;
    const questionSet = await this.questionSetRepository
      .createQueryBuilder('questionSet')
      .where('questionSet.id = :questionSetId', {
        questionSetId: questionSetId,
      })
      .getOne();

    if (!questionSet) {
      throw new NotFoundException({
        success: false,
        message: 'Question Set nof found to start quiz.',
        data: null,
      });
    }

    const questionSetAttemptPayload = this.questionSetAttemptsRepository.create(
      {
        userId: user?.sub,
        questionSet: { id: questionSet.id },
        isCompleted: false,
        startedAt: new Date(),
      },
    );
    const questionSetAttempt = await this.questionSetAttemptsRepository.save(
      questionSetAttemptPayload,
    );
    const fullAttempt = await this.questionSetAttemptsRepository
      .createQueryBuilder('attempt')
      .leftJoinAndSelect('attempt.questionSet', 'questionSet')
      .leftJoinAndSelect('questionSet.questions', 'question')
      .leftJoin('question.options', 'option') // join, but don't select all
      .addSelect(['option.id', 'option.option']) // only select these two columns
      .where('attempt.id = :id', { id: questionSetAttempt.id })
      .getOne();

    return {
      success: true,
      message: 'Quiz started, Best of luck student.',
      data: fullAttempt,
    };
  }

  async answerQuestion(
    questionSetAttemptId: string,
    questionId: string,
    payload: AnswerQuestionDto,
  ) {
    const questionSetAttempt = await this.questionSetAttemptsRepository
      .createQueryBuilder('questionSetAttempt')
      .leftJoinAndSelect('questionSetAttempt.questionSet', 'questionSet')
      .where('questionSetAttempt.id = :questionSetAttemptId', {
        questionSetAttemptId: questionSetAttemptId,
      })
      .getOne();

    if (!questionSetAttempt || questionSetAttempt.isCompleted) {
      throw new BadRequestException({
        success: false,
        message: 'Quiz not found or already completed.',
        data: null,
      });
    }

    const timeLimit = questionSetAttempt.questionSet.timeLimitSeconds;
    const now = new Date().getTime();
    const started = new Date(questionSetAttempt.startedAt).getTime();
    if (timeLimit && now - started > timeLimit * 1000) {
      throw new BadRequestException({
        success: false,
        message: 'Time for the quiz is over.',
        data: null,
      });
    }

    const question = await this.questionRepository
      .createQueryBuilder('question')
      .leftJoinAndSelect('question.options', 'option')
      .leftJoin('question.questionSets', 'questionSet')
      .where('question.id = :questionId', { questionId })
      .andWhere('questionSet.id = :questionSetId', {
        questionSetId: questionSetAttempt.questionSet.id,
      })
      .getOne();
    console.log(question);
    if (!question) {
      throw new BadRequestException({
        success: false,
        message:
          'Question does not qxists or doesnot belongs to the current question set.',
        data: null,
      });
    }

    let isCorrect = false;
    if (question.type === QuestionType.MCQ && payload.selectedOptionId) {
      const selectedOption =
        question.options &&
        question.options.find((opt) => opt.id === payload.selectedOptionId);
      if (!selectedOption) {
        throw new BadRequestException({
          success: false,
          message: 'Option selected does not belong to the current question.',
          data: null,
        });
      }
      isCorrect = selectedOption.isCorrect;
    } else if (question.type === QuestionType.TRUE_OR_FALSE) {
      isCorrect =
        question.correctAnswerBoolean === payload.selectedBooleanAnswer;
    } else if (question.type === QuestionType.FILL_IN_THE_BLANKS) {
      isCorrect = !!(
        payload.selectedTextAnswer &&
        payload.selectedTextAnswer.trim().toLowerCase() ===
          question.correctAnswerText?.trim().toLowerCase()
      );
    }

    let existingAttempt = await this.questionAttemptRepository
      .createQueryBuilder('attempt')
      .leftJoinAndSelect('attempt.questionSetAttempt', 'questionSetAttempt')
      .leftJoinAndSelect('attempt.question', 'question')
      .where('questionSetAttempt.id = :questionSetAttemptId', {
        questionSetAttemptId,
      })
      .andWhere('question.id = :questionId', { questionId })
      .getOne();

    if (!existingAttempt) {
      existingAttempt = this.questionAttemptRepository.create({
        questionSetAttempt,
        question,
      });
    }

    existingAttempt.selectedOptionId = payload.selectedOptionId;
    existingAttempt.selectedBooleanAnswer = payload.selectedBooleanAnswer;
    existingAttempt.selectedTextAnswer = payload.selectedTextAnswer;
    existingAttempt.isCorrect = isCorrect;

    await this.questionAttemptRepository.save(existingAttempt);

    return { success: true, message: 'Question attempted successfully' };
  }

  async finishQuiz(questionSetAttemptId: string) {
    const questionSetAttempt = await this.questionSetAttemptsRepository
      .createQueryBuilder('questionSetAttempt')
      .leftJoinAndSelect('questionSetAttempt.questionSet', 'questionSet')
      .leftJoinAndSelect('questionSet.questions', 'questions')
      .where('questionSetAttempt.id = :questionSetAttemptId', {
        questionSetAttemptId,
      })
      .getOne();

    if (!questionSetAttempt || questionSetAttempt.isCompleted) {
      throw new BadRequestException({
        success: false,
        message: 'Quiz not found or already completed.',
        data: null,
      });
    }

    const attempts = await this.questionAttemptRepository
      .createQueryBuilder('questionAttempt')
      .where('questionAttempt.questionSetAttemptId = :questionSetAttemptId', {
        questionSetAttemptId,
      })
      .getMany();

    const correctCount = attempts.filter((a) => a.isCorrect).length;
    // const total = attempts.length;
    const total = questionSetAttempt.questionSet.questions.length;

    questionSetAttempt.isCompleted = true;
    questionSetAttempt.completedAt = new Date();
    questionSetAttempt.score = correctCount;
    questionSetAttempt.percentage =
      total > 0 ? (correctCount / total) * 100 : 0;

    await this.questionSetAttemptsRepository.save(questionSetAttempt);

    return {
      status: 200,
      message: 'Quiz completed.',
      data: {
        score: correctCount,
        total,
        percentage: questionSetAttempt.percentage,
      },
    };
  }
}

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
import { DataSource, Repository } from 'typeorm';
import { QuestionAttempt } from '../question-attempt/entities/question-attempt.entity';
import { QuestionStats } from '../question-stats/entities/question-stat.entity';
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
    @InjectRepository(QuestionStats)
    private readonly questionStatsRepository: Repository<QuestionStats>,
    private readonly dataSource: DataSource, // required for transaction
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

    return {
      success: true,
      message: 'Quiz started, Best of luck student.',
      data: questionSetAttempt,
    };
  }

  async getQuestionSetAttempts() {
    const user = this.request.user;
    const questionSetAttempts = await this.questionSetAttemptsRepository
      .createQueryBuilder('questionSetAttempt')
      .leftJoinAndSelect('questionSetAttempt.questionSet', 'questionSet')
      .leftJoinAndSelect('questionSet.category', 'category')
      .where('questionSetAttempt.userId = :userId', { userId: user?.sub })
      .getMany();

    return {
      success: true,
      message: 'Question attempts fetched successful.',
      data: questionSetAttempts,
    };
  }

  async getQuestionSetAttempt(questionSetAttemptId: string) {
    const user = this.request.user;
    const questionSetAttempt = await this.questionSetAttemptsRepository
      .createQueryBuilder('attempt')
      .leftJoinAndSelect('attempt.questionSet', 'questionSet')
      .leftJoin('questionSet.questions', 'question') // don't auto-select question
      .leftJoin('question.options', 'option') // don't auto-select option
      .leftJoin('question.subject', 'subject') // don't auto-select option
      .leftJoin('question.subSubject', 'subSubject') // don't auto-select option
      .addSelect([
        'question.id',
        'question.question',
        'question.type',
        'question.difficulty',
        'option.id',
        'option.option',
        'subject.id',
        'subject.name',
        'subSubject.id',
        'subSubject.name',
      ])
      .where('attempt.id = :id', { id: questionSetAttemptId })
      .andWhere('attempt.userId = :userId', { userId: user?.sub })
      .getOne();

    if (!questionSetAttempt) {
      throw new NotFoundException({
        success: false,
        message: 'Question Set attempt not found.',
        data: null,
      });
    }

    return {
      success: true,
      message: 'Question set fetch successful.',
      data: questionSetAttempt,
    };
  }

  async answerQuestion(
    questionSetAttemptId: string,
    questionId: string,
    payload: AnswerQuestionDto,
  ) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const questionSetAttempt = await queryRunner.manager
        .getRepository(QuestionSetAttempt)
        .createQueryBuilder('questionSetAttempt')
        .leftJoinAndSelect('questionSetAttempt.questionSet', 'questionSet')
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

      const timeLimit = questionSetAttempt.questionSet.timeLimitSeconds;
      const now = Date.now();
      const started = new Date(questionSetAttempt.startedAt).getTime();

      if (timeLimit && now - started > timeLimit * 1000) {
        throw new BadRequestException({
          success: false,
          message: 'Time limit for this quiz has been exceeded.',
          data: null,
        });
      }

      const question = await queryRunner.manager
        .getRepository(Question)
        .createQueryBuilder('question')
        .leftJoinAndSelect('question.options', 'option')
        .leftJoin('question.questionSets', 'questionSet')
        .where('question.id = :questionId', { questionId })
        .andWhere('questionSet.id = :questionSetId', {
          questionSetId: questionSetAttempt.questionSet.id,
        })
        .getOne();

      if (!question) {
        throw new BadRequestException({
          success: false,
          message:
            'Question not found or does not belong to the selected question set.',
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
            message:
              'The selected option does not belong to the given question.',
            data: null,
          });
        }
        isCorrect = selectedOption.isCorrect;
      } else if (question.type === QuestionType.TRUE_OR_FALSE) {
        isCorrect =
          question.correctAnswerBoolean === payload.selectedBooleanAnswer;
        console.log('IS CORRECT : ', isCorrect);
      } else if (question.type === QuestionType.FILL_IN_THE_BLANKS) {
        isCorrect = !!(
          payload.selectedTextAnswer &&
          payload.selectedTextAnswer.trim().toLowerCase() ===
            question.correctAnswerText?.trim().toLowerCase()
        );
      } else {
        throw new BadRequestException({
          success: false,
          message: 'Invalid answer for the question.',
          data: null,
        });
      }

      let existingAttempt = await queryRunner.manager
        .getRepository(QuestionAttempt)
        .createQueryBuilder('questionAttempt')
        .leftJoinAndSelect(
          'questionAttempt.questionSetAttempt',
          'questionSetAttempt',
        )
        .leftJoinAndSelect('questionAttempt.question', 'question')
        .where('questionSetAttempt.id = :questionSetAttemptId', {
          questionSetAttemptId,
        })
        .andWhere('question.id = :questionId', { questionId })
        .getOne();

      // Update question stats before creating questionAttempt
      let questionStats = await queryRunner.manager
        .getRepository(QuestionStats)
        .createQueryBuilder('questionStats')
        .leftJoinAndSelect('questionStats.question', 'question')
        .where('question.id = :questionId', { questionId: question.id })
        .getOne();
      if (!questionStats) {
        // Create new stats entry
        questionStats = queryRunner.manager
          .getRepository(QuestionStats)
          .create({
            question,
            timesUsed: 1,
            timesAnsweredCorrectly: isCorrect ? 1 : 0,
          });
      } else {
        // Update the existing stats]
        if (!existingAttempt) {
          questionStats.timesUsed += 1;
          questionStats.timesAnsweredCorrectly = isCorrect
            ? questionStats.timesAnsweredCorrectly++
            : questionStats.timesAnsweredCorrectly;
        } else {
          if (isCorrect) {
            questionStats.timesAnsweredCorrectly = existingAttempt.isCorrect
              ? questionStats.timesAnsweredCorrectly
              : questionStats.timesAnsweredCorrectly + 1;
          } else {
            questionStats.timesAnsweredCorrectly = existingAttempt.isCorrect
              ? questionStats.timesAnsweredCorrectly - 1
              : questionStats.timesAnsweredCorrectly;
          }
        }
      }
      await queryRunner.manager
        .getRepository(QuestionStats)
        .save(questionStats);

      if (!existingAttempt) {
        existingAttempt = queryRunner.manager
          .getRepository(QuestionAttempt)
          .create({
            questionSetAttempt,
            question,
          });
      }

      existingAttempt.selectedOptionId = payload.selectedOptionId;
      existingAttempt.selectedBooleanAnswer = payload.selectedBooleanAnswer;
      existingAttempt.selectedTextAnswer = payload.selectedTextAnswer;
      existingAttempt.isCorrect = isCorrect;

      await queryRunner.manager
        .getRepository(QuestionAttempt)
        .save(existingAttempt);

      await queryRunner.commitTransaction();

      return {
        success: true,
        message: 'Answer submitted successfully.',
      };
    } catch (error: unknown) {
      await queryRunner.rollbackTransaction();
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to submit answer.';
      throw new BadRequestException({
        success: false,
        message: errorMessage,
        data: null,
      });
    } finally {
      await queryRunner.release();
    }
  }
  // async answerQuestion(
  //   questionSetAttemptId: string,
  //   questionId: string,
  //   payload: AnswerQuestionDto,
  // ) {
  //   const queryRunner = this.dataSource.createQueryRunner();
  //   await queryRunner.connect();
  //   await queryRunner.startTransaction();
  //   const questionSetAttempt = await this.questionSetAttemptsRepository
  //     .createQueryBuilder('questionSetAttempt')
  //     .leftJoinAndSelect('questionSetAttempt.questionSet', 'questionSet')
  //     .where('questionSetAttempt.id = :questionSetAttemptId', {
  //       questionSetAttemptId: questionSetAttemptId,
  //     })
  //     .getOne();

  //   if (!questionSetAttempt || questionSetAttempt.isCompleted) {
  //     throw new BadRequestException({
  //       success: false,
  //       message: 'Quiz not found or already completed.',
  //       data: null,
  //     });
  //   }

  //   const timeLimit = questionSetAttempt.questionSet.timeLimitSeconds;
  //   const now = new Date().getTime();
  //   const started = new Date(questionSetAttempt.startedAt).getTime();
  //   if (timeLimit && now - started > timeLimit * 1000) {
  //     throw new BadRequestException({
  //       success: false,
  //       message: 'Time for the quiz is over.',
  //       data: null,
  //     });
  //   }

  //   const question = await this.questionRepository
  //     .createQueryBuilder('question')
  //     .leftJoinAndSelect('question.options', 'option')
  //     .leftJoin('question.questionSets', 'questionSet')
  //     .where('question.id = :questionId', { questionId })
  //     .andWhere('questionSet.id = :questionSetId', {
  //       questionSetId: questionSetAttempt.questionSet.id,
  //     })
  //     .getOne();
  //   console.log(question);
  //   if (!question) {
  //     throw new BadRequestException({
  //       success: false,
  //       message:
  //         'Question does not qxists or doesnot belongs to the current question set.',
  //       data: null,
  //     });
  //   }

  //   let isCorrect = false;
  //   if (question.type === QuestionType.MCQ && payload.selectedOptionId) {
  //     const selectedOption =
  //       question.options &&
  //       question.options.find((opt) => opt.id === payload.selectedOptionId);
  //     if (!selectedOption) {
  //       throw new BadRequestException({
  //         success: false,
  //         message: 'Option selected does not belong to the current question.',
  //         data: null,
  //       });
  //     }
  //     isCorrect = selectedOption.isCorrect;
  //   } else if (question.type === QuestionType.TRUE_OR_FALSE) {
  //     isCorrect =
  //       question.correctAnswerBoolean === payload.selectedBooleanAnswer;
  //   } else if (question.type === QuestionType.FILL_IN_THE_BLANKS) {
  //     isCorrect = !!(
  //       payload.selectedTextAnswer &&
  //       payload.selectedTextAnswer.trim().toLowerCase() ===
  //         question.correctAnswerText?.trim().toLowerCase()
  //     );
  //   }

  //   let existingAttempt = await this.questionAttemptRepository
  //     .createQueryBuilder('attempt')
  //     .leftJoinAndSelect('attempt.questionSetAttempt', 'questionSetAttempt')
  //     .leftJoinAndSelect('attempt.question', 'question')
  //     .where('questionSetAttempt.id = :questionSetAttemptId', {
  //       questionSetAttemptId,
  //     })
  //     .andWhere('question.id = :questionId', { questionId })
  //     .getOne();

  //   if (!existingAttempt) {
  //     existingAttempt = this.questionAttemptRepository.create({
  //       questionSetAttempt,
  //       question,
  //     });
  //   }

  //   existingAttempt.selectedOptionId = payload.selectedOptionId;
  //   existingAttempt.selectedBooleanAnswer = payload.selectedBooleanAnswer;
  //   existingAttempt.selectedTextAnswer = payload.selectedTextAnswer;
  //   existingAttempt.isCorrect = isCorrect;

  //   await this.questionAttemptRepository.save(existingAttempt);

  //   return { success: true, message: 'Question attempted successfully' };
  // }

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
      success: true,
      message: 'Quiz completed.',
      data: {
        score: correctCount,
        total,
        percentage: questionSetAttempt.percentage,
      },
    };
  }
}

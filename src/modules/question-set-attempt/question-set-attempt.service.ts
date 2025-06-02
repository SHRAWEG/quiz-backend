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
import {
  QuestionSet,
  QuestionSetStatus,
} from 'src/modules/question-sets/entities/question-set.entity';
import { DataSource, QueryRunner, Repository } from 'typeorm';
import { QuestionAttempt } from '../question-attempt/entities/question-attempt.entity';
import { QuestionStats } from '../question-stats/entities/question-stat.entity';
import { QuestionAttemptDto } from './dto/question-attempt.dto';
import { ReviewAnswerDto } from './dto/review-answer.dto copy';

@Injectable()
export class QuestionSetAttemptService {
  constructor(
    @InjectRepository(QuestionSetAttempt)
    private readonly questionSetAttemptsRepository: Repository<QuestionSetAttempt>,
    @InjectRepository(QuestionAttempt)
    private readonly questionAttemptRepository: Repository<QuestionAttempt>,
    private readonly dataSource: DataSource,
    @Inject(REQUEST) private readonly request: Request,
  ) {}

  async startQuestionSetAttempt(questionSetId: string) {
    const user = this.request.user;
    // INITIALIZING AND STARTING THE DB TRANSACTION
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      // REPOSITORY INITIALIZATION
      const questionSetRepo = queryRunner.manager.getRepository(QuestionSet);
      const questionSetAttemptRepo =
        queryRunner.manager.getRepository(QuestionSetAttempt);
      const questionAttemptRepo =
        queryRunner.manager.getRepository(QuestionAttempt);
      const questionStatRepo = queryRunner.manager.getRepository(QuestionStats);

      //
      const questionSet = await questionSetRepo
        .createQueryBuilder('questionSet')
        .leftJoinAndSelect('questionSet.questions', 'question')
        .where('questionSet.id = :questionSetId', {
          questionSetId: questionSetId,
        })
        .andWhere('questionSet.status = :status', {
          status: QuestionSetStatus.PUBLISHED,
        })
        .getOne();

      if (!questionSet) {
        throw new NotFoundException({
          success: false,
          message: 'Question Set not found to start quiz.',
          data: null,
        });
      }

      const now = new Date();
      const expiryAt =
        questionSet.isTimeLimited && questionSet.timeLimitSeconds
          ? new Date(now.getTime() + questionSet.timeLimitSeconds * 1000)
          : null;

      const questionSetAttemptPayload = questionSetAttemptRepo.create({
        userId: user?.sub,
        questionSet: { id: questionSet.id },
        isCompleted: false,
        startedAt: now,
        expiryAt: expiryAt,
      });
      const questionSetAttempt = await questionSetAttemptRepo.save(
        questionSetAttemptPayload,
      );

      // Create Question Attempts on Question Set Attempt
      const questions = questionSet.questions;
      for (const question of questions) {
        const questionAttemptPayload = questionAttemptRepo.create({
          questionSetAttemptId: questionSetAttempt.id,
          questionId: question.id,
          isCorrect: false,
        });
        await questionAttemptRepo.save(questionAttemptPayload);

        let questionStat = await questionStatRepo
          .createQueryBuilder('questionStats')
          .leftJoinAndSelect('questionStats.question', 'question')
          .where('question.id = :questionId', { questionId: question.id })
          .getOne();

        if (!questionStat) {
          questionStat = queryRunner.manager
            .getRepository(QuestionStats)
            .create({
              questionId: question.id,
              timesUsed: 1,
              timesAnsweredCorrectly: 0,
            });
        } else {
          questionStat.timesUsed += 1;
        }
        await questionStatRepo.save(questionStat);
      }

      await queryRunner.commitTransaction();

      // const remainingTimeSeconds =
      //   questionSet.isTimeLimited && expiryAt
      //     ? Math.max(0, Math.floor((expiryAt.getTime() - now.getTime()) / 1000))
      //     : null;

      return {
        success: true,
        message: 'Quiz started, Best of luck student.',
        data: {
          // remainingTimeSeconds: remainingTimeSeconds,
          // serverTime: new Date().toISOString(),
          // expiryAt: expiryAt,
          // startedAt: now,
          // questionSetAttempt:
          ...questionSetAttempt,
        },
      };
    } catch (error) {
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

  async getQuestionSetAttempts() {
    const user = this.request.user;
    const questionSetAttempts = await this.questionSetAttemptsRepository
      .createQueryBuilder('questionSetAttempt')
      .leftJoinAndSelect('questionSetAttempt.questionSet', 'questionSet')
      .leftJoinAndSelect('questionSet.category', 'category')
      .where('questionSetAttempt.userId = :userId', { userId: user?.sub })
      .orderBy('questionSetAttempt.completedAt', 'DESC')
      .getMany();

    return {
      success: true,
      message: 'Question attempts fetched successful.',
      data: questionSetAttempts,
    };
  }

  async getQuestionSetAttemptsToReview() {
    const questionSetAttempts = await this.questionSetAttemptsRepository
      .createQueryBuilder('questionSetAttempt')
      .leftJoinAndSelect('questionSetAttempt.questionSet', 'questionSet')
      .leftJoinAndSelect('questionSet.category', 'category')
      .andWhere('questionSetAttempt.isChecked = :isChecked', {
        isChecked: false,
      })
      .andWhere('questionSetAttempt.isCompleted = :isCompleted', {
        isCompleted: true,
      })
      .orderBy('questionSetAttempt.completedAt', 'DESC')
      .getMany();

    return {
      success: true,
      message: 'Question attempts to review fetched successfully.',
      data: questionSetAttempts,
    };
  }

  async getQuestionSetAttemptById(questionSetAttemptId: string) {
    const user = this.request.user;

    const questionSetAttempt = await this.questionSetAttemptsRepository
      .createQueryBuilder('questionSetAttempt')
      .leftJoinAndSelect('questionSetAttempt.questionSet', 'questionSet') // include all fields
      .leftJoinAndSelect('questionSet.category', 'category') // include all fields
      .leftJoin('questionSetAttempt.questionAttempts', 'questionAttempt')
      .leftJoin('questionAttempt.question', 'question') // don't select all fields
      .leftJoin('question.options', 'option') // don't select all fields
      .leftJoinAndSelect('question.subject', 'subject') // include all fields
      .leftJoinAndSelect('question.subSubject', 'subSubject') // include all fields
      // Select specific fields from `questionAttempt`
      .addSelect([
        'questionAttempt.id',
        'questionAttempt.selectedTextAnswer',
        'questionAttempt.selectedBooleanAnswer',
        'questionAttempt.selectedOptionId',
        'questionAttempt.questionId',
        'questionAttempt.createdAt',
        'questionAttempt.updatedAt',
      ])
      // Select specific fields from `question`
      .addSelect([
        'question.id',
        'question.questionText',
        'question.type',
        'question.difficulty',
        'question.subjectId',
        'question.subSubjectId',
        'question.createdAt',
        'question.updatedAt',
      ])
      // Select specific fields from `option`
      .addSelect(['option.id', 'option.optionText'])
      .where('questionSetAttempt.id = :id', { id: questionSetAttemptId })
      .andWhere('questionSetAttempt.userId = :userId', { userId: user?.sub })
      .orderBy('questionAttempt.id', 'ASC')
      .getOne();

    if (!questionSetAttempt) {
      throw new NotFoundException({
        success: false,
        message: 'Question Set attempt not found.',
        data: null,
      });
    }

    // const formattedAttempts = questionSetAttempt.questionAttempts.map(
    //   (attempt) => ({
    //     id: attempt.id,
    //     selectedAnswer:
    //       attempt.selectedOptionId ??
    //       attempt.selectedBooleanAnswer ??
    //       attempt.selectedTextAnswer ??
    //       null,
    //     question: {
    //       id: attempt.question.id,
    //       question: attempt.question.questionText,
    //       type: attempt.question.type,
    //       difficulty: attempt.question.difficulty,
    //       subject: {
    //         id: attempt.question.subject?.id,
    //         name: attempt.question.subject?.name,
    //       },
    //       subSubject: {
    //         id: attempt.question.subSubject?.id,
    //         name: attempt.question.subSubject?.name,
    //       },
    //       options: attempt.question.options?.map((opt) => ({
    //         id: opt.id,
    //         option: opt.option_text,
    //       })),
    //     },
    //   }),
    // );

    // const attemptedQuestionsCount = questionSetAttempt.questionAttempts.filter(
    //   (a) =>
    //     (a.selectedOptionId !== null && a.selectedOptionId !== undefined) ||
    //     (a.selectedBooleanAnswer !== null &&
    //       a.selectedBooleanAnswer !== undefined) ||
    //     (a.selectedTextAnswer && a.selectedTextAnswer.trim() !== ''),
    // ).length;

    // const formatted = {
    //   id: questionSetAttempt.id,
    //   questionSetId: questionSetAttempt.questionSet.id,
    //   startedAt: questionSetAttempt.startedAt,
    //   completedAt: questionSetAttempt.completedAt,
    //   isCompleted: questionSetAttempt.isCompleted,
    //   questionSetName: questionSetAttempt.questionSet.name,
    //   questionSetCategory: questionSetAttempt.questionSet.category,
    //   questionSetTimer: questionSetAttempt.questionSet.timeLimitSeconds,
    //   attemptedQuestionsCount,
    //   questionAttepts: formattedAttempts,
    // };

    return {
      success: true,
      message: 'Question set fetch successful.',
      data: questionSetAttempt,
    };
  }

  async getQuestionSetAttemptReportById(questionSetAttemptId: string) {
    const user = this.request.user;

    const questionSetAttempt = await this.questionSetAttemptsRepository
      .createQueryBuilder('questionSetAttempt')
      .leftJoinAndSelect('questionSetAttempt.questionSet', 'questionSet')
      .leftJoinAndSelect('questionSet.category', 'category')
      .leftJoinAndSelect(
        'questionSetAttempt.questionAttempts',
        'questionAttempt',
      )
      .leftJoinAndSelect('questionAttempt.question', 'question')
      .leftJoinAndSelect('question.options', 'option')
      .leftJoinAndSelect('question.subject', 'subject')
      .leftJoinAndSelect('question.subSubject', 'subSubject')
      .where('questionSetAttempt.id = :id', { id: questionSetAttemptId })
      .andWhere('questionSetAttempt.userId = :userId', { userId: user?.sub })
      // .andWhere('questionSetAttempt.isCompleted = :isCompleted', {
      //   isCompleted: true,
      // })
      .orderBy('questionAttempt.createdAt', 'ASC')
      .getOne();

    if (!questionSetAttempt) {
      throw new NotFoundException({
        success: false,
        message: 'Question Set attempt not found.',
        data: null,
      });
    }
    if (!questionSetAttempt.isCompleted) {
      throw new NotFoundException({
        success: false,
        message: 'Question Set attempt is not completed yet.',
        data: null,
      });
    }

    // const questionAttempts = questionSetAttempt.questionAttempts.map(
    //   (attempt) => {
    //     const { question } = attempt;

    //     const selectedAnswer =
    //       attempt.selectedOptionId ??
    //       attempt.selectedBooleanAnswer ??
    //       attempt.selectedTextAnswer ??
    //       null;

    //     // We use stored `isCorrect` and pull correct answer from question
    //     let correctAnswer: string | boolean | null = null;

    //     switch (question.type) {
    //       case QuestionType.MCQ:
    //         correctAnswer =
    //           question.options?.find((opt) => opt.isCorrect)?.id ?? null;
    //         break;
    //       case QuestionType.TRUE_OR_FALSE:
    //         correctAnswer =
    //           typeof question.correctAnswerBoolean == 'boolean'
    //             ? question.correctAnswerBoolean
    //             : null;
    //         break;
    //       case QuestionType.FILL_IN_THE_BLANKS:
    //         correctAnswer =
    //           typeof question.correctAnswerText == 'string'
    //             ? question.correctAnswerText
    //             : null;
    //         break;
    //     }

    //     return {
    //       id: attempt.id,
    //       selectedAnswer,
    //       isCorrect: attempt.isCorrect,
    //       question: {
    //         id: question.id,
    //         question: question.questionText,
    //         type: question.type,
    //         difficulty: question.difficulty,
    //         subject: {
    //           id: question.subject?.id,
    //           name: question.subject?.name,
    //         },
    //         subSubject: {
    //           id: question.subSubject?.id,
    //           name: question.subSubject?.name,
    //         },
    //         options: question.options?.map((opt) => ({
    //           id: opt.id,
    //           option: opt.option_text,
    //           isCorrect: opt.isCorrect,
    //         })),
    //         correctAnswer,
    //       },
    //     };
    //   },
    // );

    // const attemptedQuestionsCount = questionAttempts.filter(
    //   (a) => a.selectedAnswer !== null,
    // ).length;

    // const report = {
    //   id: questionSetAttempt.id,
    //   questionSetId: questionSetAttempt.questionSet.id,
    //   startedAt: questionSetAttempt.startedAt,
    //   completedAt: questionSetAttempt.completedAt,
    //   isCompleted: questionSetAttempt.isCompleted,
    //   score: questionSetAttempt.score,
    //   percentage: questionSetAttempt.percentage,
    //   questionSetName: questionSetAttempt.questionSet.name,
    //   questionSetCategory: questionSetAttempt.questionSet.category,
    //   questionSetTimer: questionSetAttempt.questionSet.timeLimitSeconds,
    //   attemptedQuestionsCount,
    //   questionAttempts,
    // };

    return {
      success: true,
      message: 'Question set report generated successfully.',
      data: questionSetAttempt,
    };
  }

  async getQuestionSetAttemptToReviewById(questionSetAttemptId: string) {
    const questionSetAttempt = await this.questionSetAttemptsRepository
      .createQueryBuilder('questionSetAttempt')
      .leftJoinAndSelect('questionSetAttempt.questionSet', 'questionSet')
      .leftJoinAndSelect('questionSet.category', 'category')
      .leftJoinAndSelect(
        'questionSetAttempt.questionAttempts',
        'questionAttempt',
      )
      .leftJoinAndSelect('questionAttempt.question', 'question')
      .leftJoinAndSelect('question.options', 'option')
      .leftJoinAndSelect('question.subject', 'subject')
      .leftJoinAndSelect('question.subSubject', 'subSubject')
      .where('questionSetAttempt.id = :id', { id: questionSetAttemptId })
      // .andWhere('questionSetAttempt.isCompleted = :isCompleted', {
      //   isCompleted: true,
      // })
      .orderBy('questionAttempt.id', 'ASC')
      .getOne();

    if (!questionSetAttempt) {
      throw new NotFoundException({
        success: false,
        message: 'Question Set attempt not found.',
        data: null,
      });
    }
    if (!questionSetAttempt.isCompleted) {
      throw new NotFoundException({
        success: false,
        message: 'Question Set attempt is not completed yet.',
        data: null,
      });
    }

    // const questionAttempts = questionSetAttempt.questionAttempts.map(
    //   (attempt) => {
    //     const { question } = attempt;

    //     const selectedAnswer =
    //       attempt.selectedOptionId ??
    //       attempt.selectedBooleanAnswer ??
    //       attempt.selectedTextAnswer ??
    //       null;

    //     // We use stored `isCorrect` and pull correct answer from question
    //     let correctAnswer: string | boolean | null = null;

    //     switch (question.type) {
    //       case QuestionType.MCQ:
    //         correctAnswer =
    //           question.options?.find((opt) => opt.isCorrect)?.id ?? null;
    //         break;
    //       case QuestionType.TRUE_OR_FALSE:
    //         correctAnswer =
    //           typeof question.correctAnswerBoolean == 'boolean'
    //             ? question.correctAnswerBoolean
    //             : null;
    //         break;
    //       case QuestionType.FILL_IN_THE_BLANKS:
    //         correctAnswer =
    //           typeof question.correctAnswerText == 'string'
    //             ? question.correctAnswerText
    //             : null;
    //         break;
    //     }

    //     return {
    //       id: attempt.id,
    //       selectedAnswer,
    //       isCorrect: attempt.isCorrect,
    //       question: {
    //         id: question.id,
    //         question: question.questionText,
    //         type: question.type,
    //         difficulty: question.difficulty,
    //         subject: {
    //           id: question.subject?.id,
    //           name: question.subject?.name,
    //         },
    //         subSubject: {
    //           id: question.subSubject?.id,
    //           name: question.subSubject?.name,
    //         },
    //         options: question.options?.map((opt) => ({
    //           id: opt.id,
    //           option: opt.option_text,
    //           isCorrect: opt.isCorrect,
    //         })),
    //         correctAnswer,
    //       },
    //     };
    //   },
    // );

    // const attemptedQuestionsCount = questionAttempts.filter(
    //   (a) => a.selectedAnswer !== null,
    // ).length;

    // const report = {
    //   id: questionSetAttempt.id,
    //   questionSetId: questionSetAttempt.questionSet.id,
    //   startedAt: questionSetAttempt.startedAt,
    //   completedAt: questionSetAttempt.completedAt,
    //   isCompleted: questionSetAttempt.isCompleted,
    //   score: questionSetAttempt.score,
    //   percentage: questionSetAttempt.percentage,
    //   questionSetName: questionSetAttempt.questionSet.name,
    //   questionSetCategory: questionSetAttempt.questionSet.category,
    //   questionSetTimer: questionSetAttempt.questionSet.timeLimitSeconds,
    //   attemptedQuestionsCount,
    //   questionAttempts,
    // };

    return {
      success: true,
      message: 'Question set report generated successfully.',
      data: questionSetAttempt,
    };
  }

  async getQuestionSetAttemptStatusById(questionSetAttemptId: string) {
    const user = this.request.user;
    const now = new Date();

    const questionSetAttempt = await this.questionSetAttemptsRepository
      .createQueryBuilder('questionSetAttempt')
      .leftJoinAndSelect('questionSetAttempt.questionSet', 'questionSet')
      .where('questionSetAttempt.id = :id', { id: questionSetAttemptId })
      .andWhere('questionSetAttempt.userId = :userId', { userId: user?.sub })
      .getOne();

    if (!questionSetAttempt) {
      throw new NotFoundException('Quiz attempt not found');
    }

    const remainingSeconds =
      questionSetAttempt.questionSet.isTimeLimited &&
      questionSetAttempt.expiryAt
        ? Math.max(
            0,
            Math.floor(
              (questionSetAttempt.expiryAt.getTime() - now.getTime()) / 1000,
            ),
          )
        : null;

    const isExpired =
      questionSetAttempt.expiryAt && now > questionSetAttempt.expiryAt;

    if (isExpired && !questionSetAttempt.isCompleted) {
      // Auto-complete if expired
      await this.completeQuiz(questionSetAttemptId);
      questionSetAttempt.isCompleted = true;
    }

    return {
      success: true,
      data: {
        id: questionSetAttempt.id,
        startedAt: questionSetAttempt.startedAt,
        expiryAt: questionSetAttempt.expiryAt,
        timeLimitSeconds: questionSetAttempt.questionSet.timeLimitSeconds,
        serverTime: now.toISOString(),
        remainingTimeSeconds: remainingSeconds,
        isCompleted: questionSetAttempt.isCompleted,
        isExpired,
      },
    };
  }

  async answerQuestion(
    questionSetAttemptId: string,
    payload: QuestionAttemptDto,
  ) {
    const user = this.request.user;
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
        .andWhere('questionSetAttempt.userId = :userId', {
          userId: user!.sub,
        })
        .getOne();

      // CHECK IF THE QUESTION SET ATTEMPT EXISTS OR BELONGS TO THE USER OR NOT
      if (!questionSetAttempt || questionSetAttempt.isCompleted) {
        throw new BadRequestException({
          success: false,
          message:
            'Quiz not found or already completed or does not belongs to the current user.',
          data: null,
        });
      }

      // CHECK IF THE QUIZ IS EXPIRED
      const now = new Date();
      if (
        questionSetAttempt.questionSet.isTimeLimited &&
        questionSetAttempt.expiryAt &&
        now > questionSetAttempt.expiryAt
      ) {
        throw new BadRequestException({
          success: false,
          message: 'Time limit for this quiz has been exceeded.',
          data: null,
        });
      }

      const questionAttempt = await queryRunner.manager
        .getRepository(QuestionAttempt)
        .createQueryBuilder('questionAttempt')
        .leftJoinAndSelect('questionAttempt.question', 'question')
        .leftJoinAndSelect('question.options', 'option')
        .leftJoin('questionAttempt.questionSetAttempt', 'questionSetAttempt')
        .where('questionAttempt.id = :questionAttemptId', {
          questionAttemptId: payload.questionAttemptId,
        })
        .andWhere('questionSetAttempt.id = :questionSetAttemptId', {
          questionSetAttemptId: questionSetAttemptId,
        })
        .getOne();

      const question = questionAttempt?.question;

      if (!question) {
        throw new BadRequestException({
          success: false,
          message:
            'Question not found or does not belong to the selected question set.',
          data: null,
        });
      }

      let isCorrect: boolean | null = false;
      let isChecked: boolean | null = true;
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
      } else if (
        question.type === QuestionType.SHORT ||
        question.type === QuestionType.LONG
      ) {
        isCorrect = null;
        isChecked = false;
      } else {
        throw new BadRequestException({
          success: false,
          message: 'Invalid answer for the question.',
          data: null,
        });
      }

      // Update question stats before creating questionAttempt
      // Update stats only for auto-evaluable question types
      if (
        question.type === QuestionType.MCQ ||
        question.type === QuestionType.TRUE_OR_FALSE ||
        question.type === QuestionType.FILL_IN_THE_BLANKS
      ) {
        const questionStats = await queryRunner.manager
          .getRepository(QuestionStats)
          .createQueryBuilder('questionStats')
          .leftJoinAndSelect('questionStats.question', 'question')
          .where('question.id = :questionId', { questionId: question.id })
          .getOne();

        if (isCorrect) {
          questionStats!.timesAnsweredCorrectly = questionAttempt?.isCorrect
            ? questionStats!.timesAnsweredCorrectly
            : questionStats!.timesAnsweredCorrectly + 1;
        } else {
          questionStats!.timesAnsweredCorrectly = questionAttempt?.isCorrect
            ? questionStats!.timesAnsweredCorrectly - 1
            : questionStats!.timesAnsweredCorrectly;
        }

        await queryRunner.manager
          .getRepository(QuestionStats)
          .save(questionStats!);
      }

      questionAttempt.selectedOptionId = payload.selectedOptionId;
      questionAttempt.selectedBooleanAnswer = payload.selectedBooleanAnswer;
      questionAttempt.selectedTextAnswer = payload.selectedTextAnswer;
      questionAttempt.isCorrect = isCorrect;
      questionAttempt.isChecked = isChecked;

      await queryRunner.manager
        .getRepository(QuestionAttempt)
        .save(questionAttempt);

      await queryRunner.commitTransaction();
      // Calculate remaining time for response (only for time-limited quizzes)
      const remainingSeconds =
        questionSetAttempt.questionSet.isTimeLimited &&
        questionSetAttempt.expiryAt
          ? Math.max(
              0,
              Math.floor(
                (questionSetAttempt.expiryAt.getTime() - now.getTime()) / 1000,
              ),
            )
          : null;

      return {
        success: true,
        message: 'Answer submitted successfully.',
        data: {
          expiryAt: questionSetAttempt.expiryAt,
          startedAt: questionSetAttempt.startedAt,
          remainingTimeSeconds: remainingSeconds,
          serverTime: now.toISOString(),
        },
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

  async finishQuiz(questionSetAttemptId: string) {
    const user = this.request.user;
    const questionSetAttempt = await this.questionSetAttemptsRepository
      .createQueryBuilder('questionSetAttempt')
      .leftJoinAndSelect('questionSetAttempt.questionSet', 'questionSet')
      .leftJoinAndSelect('questionSet.questions', 'question')
      .where('questionSetAttempt.id = :questionSetAttemptId', {
        questionSetAttemptId,
      })
      .andWhere('questionSetAttempt.userId = :userId', {
        userId: user!.sub,
      })
      .getOne();

    if (!questionSetAttempt || questionSetAttempt.isCompleted) {
      throw new BadRequestException({
        success: false,
        message: 'Quiz not found or already completed.',
        data: null,
      });
    }

    const questionAttempts = await this.questionAttemptRepository
      .createQueryBuilder('questionAttempt')
      .leftJoinAndSelect('questionAttempt.question', 'question')
      .where('questionAttempt.questionSetAttemptId = :questionSetAttemptId', {
        questionSetAttemptId,
      })
      .getMany();

    const hasManuallyCheckableQuestions = questionAttempts.some(
      (questionAttempt) =>
        questionAttempt.question.type === QuestionType.SHORT ||
        questionAttempt.question.type === QuestionType.LONG,
    );

    const correctCount = questionAttempts.filter((a) => a.isCorrect).length;
    const total = questionSetAttempt.questionSet.questions.length;

    questionSetAttempt.isCompleted = true;
    questionSetAttempt.completedAt = new Date();
    questionSetAttempt.score = correctCount;
    questionSetAttempt.percentage =
      total > 0 ? (correctCount / total) * 100 : 0;
    questionSetAttempt.isChecked = hasManuallyCheckableQuestions ? false : true;

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

  async reviewAnswer(questionAttemptId: string, payload: ReviewAnswerDto) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      // REPOSITORY INITIALIZATION
      const questionSetAttemptRepo =
        queryRunner.manager.getRepository(QuestionSetAttempt);
      const questionAttemptRepo =
        queryRunner.manager.getRepository(QuestionAttempt);
      const questionStatRepo = queryRunner.manager.getRepository(QuestionStats);

      const questionAttempt = await questionAttemptRepo
        .createQueryBuilder('questionAttempt')
        .leftJoinAndSelect(
          'questionAttempt.questionSetAttempt',
          'questionSetAttempt',
        )
        .leftJoinAndSelect('questionAttempt.question', 'question')
        .leftJoinAndSelect('question.questionStats', 'questionStats')
        .where('questionAttempt.id = :questionAttemptId', {
          questionAttemptId: questionAttemptId,
        })
        .getOne();

      if (!questionAttempt) {
        throw new NotFoundException({
          success: false,
          message: 'Question attempt not found.',
          data: null,
        });
      }

      const previousIsCorrect = questionAttempt.isCorrect;
      const question = questionAttempt.question;

      if (
        questionAttempt.question.type !== QuestionType.SHORT &&
        questionAttempt.question.type !== QuestionType.LONG
      ) {
        throw new BadRequestException({
          success: false,
          message:
            'Only short or long answer questions can be reviewed manually.',
          data: null,
        });
      }

      const questionStats = await questionStatRepo
        .createQueryBuilder('questionStats')
        .leftJoinAndSelect('questionStats.question', 'question')
        .where('question.id = :questionId', { questionId: question.id })
        .getOne();

      // If review changed from incorrect to correct
      if (!previousIsCorrect && payload.isCorrect) {
        questionStats!.timesAnsweredCorrectly += 1;
      }
      // If review changed from correct to incorrect
      else if (previousIsCorrect && !payload.isCorrect) {
        questionStats!.timesAnsweredCorrectly -= 1;
      }

      // Save updated stats
      await questionStatRepo.save(questionStats!);

      // Save updated question attempt
      questionAttempt.isCorrect = payload.isCorrect;
      await questionAttemptRepo.save(questionAttempt);

      // Recalculate score for questionSetAttempt
      const questionSetAttempt = await questionSetAttemptRepo
        .createQueryBuilder('questionSetAttempt')
        .leftJoinAndSelect(
          'questionSetAttempt.questionAttempts',
          'questionAttempt',
        )
        .leftJoinAndSelect('questionSetAttempt.questionSet', 'questionSet')
        .leftJoinAndSelect('questionSet.questions', 'question')
        .where('questionSetAttempt.id = :questionSetAttemptId', {
          questionSetAttemptId: questionAttempt.questionSetAttemptId,
        })
        .getOne();

      const allQuestionAttempts = questionSetAttempt?.questionAttempts;

      const score = allQuestionAttempts!.filter((a) => a.isCorrect).length;
      const total = questionSetAttempt!.questionSet.questions.length;
      const percentage = total > 0 ? (score / total) * 100 : 0;
      questionSetAttempt!.score = score;
      questionSetAttempt!.percentage = percentage;
      await questionSetAttemptRepo.save(questionSetAttempt!);
      await queryRunner.commitTransaction();

      return {
        success: true,
        message: 'Answer reviewed and stats updated successfully.',
        data: {
          questionAttemptId,
          isCorrect: payload.isCorrect,
        },
      };
    } catch (error) {
      console.log(error);
      await queryRunner.rollbackTransaction();
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to Review the answer.';
      throw new BadRequestException({
        success: false,
        message: errorMessage,
        data: null,
      });
    } finally {
      await queryRunner.release();
    }
  }

  async markIsChecked(questionSetAttemptId: string) {
    const questionSetAttempt = await this.questionSetAttemptsRepository
      .createQueryBuilder('questionSetAttempt')
      .leftJoinAndSelect('questionSetAttempt.questionSet', 'questionSet')
      .leftJoinAndSelect('questionSet.questions', 'question')
      .where('questionSetAttempt.id = :questionSetAttemptId', {
        questionSetAttemptId: questionSetAttemptId,
      })
      .getOne();

    if (!questionSetAttempt) {
      throw new NotFoundException({
        success: false,
        message: 'Question set attempt not found.',
        data: null,
      });
    }

    // Check if it has any short or long answer questions
    const hasManualQuestions = questionSetAttempt.questionSet.questions.some(
      (question) =>
        question.type === QuestionType.SHORT ||
        question.type === QuestionType.LONG,
    );

    if (!hasManualQuestions) {
      throw new BadRequestException({
        success: false,
        message: 'This question set attempt does not require manual checking.',
        data: null,
      });
    }

    questionSetAttempt.isChecked = true;
    await this.questionSetAttemptsRepository.save(questionSetAttempt);

    return {
      success: true,
      message: 'Question set attempt marked as checked.',
      data: { questionSetAttemptId },
    };
  }

  //
  async completeQuiz(questionSetAttemptId: string, queryRunner?: QueryRunner) {
    const manager = queryRunner?.manager || this.dataSource.manager;

    const questionSetAttempt = await manager
      .getRepository(QuestionSetAttempt)
      .createQueryBuilder('questionSetAttempt')
      .leftJoinAndSelect('questionSetAttempt.questionSet', 'questionSet')
      .leftJoinAndSelect('questionSet.questions', 'question')
      .where('questionSetAttempt.id = :questionSetAttemptId', {
        questionSetAttemptId: questionSetAttemptId,
      })
      .getOne();

    if (!questionSetAttempt || questionSetAttempt.isCompleted) return;

    const questionAttempts = await manager
      .getRepository(QuestionAttempt)
      .createQueryBuilder('questionAttempt')
      .where('questionAttempt.questionSetAttemptId = :questionSetAttemptId', {
        questionSetAttemptId: questionSetAttemptId,
      })
      .getMany();

    const correctCount = questionAttempts.filter((a) => a.isCorrect).length;
    const total = questionSetAttempt.questionSet.questions.length;

    const hasManuallyCheckableQuestions =
      questionSetAttempt.questionSet.questions.some(
        (q) => q.type === QuestionType.SHORT || q.type === QuestionType.LONG,
      );

    questionSetAttempt.isCompleted = true;
    questionSetAttempt.completedAt = new Date();
    questionSetAttempt.score = correctCount;
    questionSetAttempt.percentage =
      total > 0 ? (correctCount / total) * 100 : 0;
    questionSetAttempt.isChecked = hasManuallyCheckableQuestions ? false : null;

    await manager.getRepository(QuestionSetAttempt).save(questionSetAttempt);
  }
}

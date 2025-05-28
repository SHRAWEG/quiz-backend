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
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      const questionSetRepo = queryRunner.manager.getRepository(QuestionSet);
      const questionSetAttemptRepo =
        queryRunner.manager.getRepository(QuestionSetAttempt);
      const questionAttemptRepo =
        queryRunner.manager.getRepository(QuestionAttempt);
      const questionStatRepo = queryRunner.manager.getRepository(QuestionStats);

      const questionSet = await questionSetRepo
        .createQueryBuilder('questionSet')
        .leftJoinAndSelect('questionSet.questions', 'question')
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
      const questionSetAttemptPayload = questionSetAttemptRepo.create({
        userId: user?.sub,
        questionSet: { id: questionSet.id },
        isCompleted: false,
        startedAt: new Date(),
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
      return {
        success: true,
        message: 'Quiz started, Best of luck student.',
        data: questionSetAttempt,
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
    // const questionSet = await this.questionSetRepository
    //   .createQueryBuilder('questionSet')
    //   .where('questionSet.id = :questionSetId', {
    //     questionSetId: questionSetId,
    //   })
    //   .getOne();
    // if (!questionSet) {
    //   throw new NotFoundException({
    //     success: false,
    //     message: 'Question Set nof found to start quiz.',
    //     data: null,
    //   });
    // }
    // const questionSetAttemptPayload = this.questionSetAttemptsRepository.create(
    //   {
    //     userId: user?.sub,
    //     questionSet: { id: questionSet.id },
    //     isCompleted: false,
    //     startedAt: new Date(),
    //   },
    // );
    // const questionSetAttempt = await this.questionSetAttemptsRepository.save(
    //   questionSetAttemptPayload,
    // );
    // return {
    //   success: true,
    //   message: 'Quiz started, Best of luck student.',
    //   data: questionSetAttempt,
    // };
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
      .addSelect(['option.id', 'option.option_text'])

      .where('questionSetAttempt.id = :id', { id: questionSetAttemptId })
      .andWhere('questionSetAttempt.userId = :userId', { userId: user?.sub })
      .orderBy('questionAttempt.createdAt', 'ASC')
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

  async getQuestionSetAttemptReport(questionSetAttemptId: string) {
    const user = this.request.user;

    const questionSetAttempt = await this.questionSetAttemptsRepository
      .createQueryBuilder('questionSetAttempt')
      .leftJoinAndSelect('questionSetAttempt.questionSet', 'questionSet')
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

  async answerQuestion(
    questionSetAttemptId: string,
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
        .where('question.id = :questionId', { questionId: payload.questionId })
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
        .andWhere('question.id = :questionId', {
          questionId: payload.questionId,
        })
        .getOne();

      // Update question stats before creating questionAttempt
      let questionStats = await queryRunner.manager
        .getRepository(QuestionStats)
        .createQueryBuilder('questionStats')
        .leftJoinAndSelect('questionStats.question', 'question')
        .where('question.id = :questionId', { questionId: payload.questionId })
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

import {
  BadRequestException,
  ForbiddenException,
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
import { DataSource, MoreThan, QueryRunner, Repository } from 'typeorm';
import { QuestionAttempt } from '../question-attempt/entities/question-attempt.entity';
import { QuestionStats } from '../question-stats/entities/question-stat.entity';
import {
  SubscriptionPaymentStatus,
  UserSubscription,
} from '../user-subscriptions/entities/user-subscription.entity';
import { QuestionAttemptDto } from './dto/question-attempt.dto';
import { ReviewAnswerDto } from './dto/review-answer.dto copy';

const questionSetAttemptStatuses = ['pending', 'in_review', 'completed'];

@Injectable()
export class QuestionSetAttemptService {
  constructor(
    @InjectRepository(QuestionSetAttempt)
    private readonly questionSetAttemptsRepository: Repository<QuestionSetAttempt>,
    @InjectRepository(QuestionAttempt)
    private readonly questionAttemptRepository: Repository<QuestionAttempt>,
    @InjectRepository(UserSubscription)
    private readonly userSubscriptionRepository: Repository<UserSubscription>,
    private readonly dataSource: DataSource,
    @Inject(REQUEST) private readonly request: Request,
  ) {}

  // PERMISSION : STUDENT
  /*
    SERVICES FROM HERE ARE FOR STUDENTS ONLY
  */
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

      const subscription = await this.userSubscriptionRepository.findOne({
        where: {
          userId: user.sub,
          isActive: true,
          paymentStatus: SubscriptionPaymentStatus.COMPLETE,
          expiresAt: MoreThan(new Date()), // Only not expired subscriptions
        },
        order: { createdAt: 'DESC' }, // Get the most recent
        relations: ['plan'],
      });

      if (!subscription && !questionSet.isFree) {
        throw new ForbiddenException({
          success: false,
          message: 'You need to subscribe to access premium question sets.',
          data: null,
        });
      }

      const existingAttemptsCount = await questionSetAttemptRepo
        .createQueryBuilder('questionSetAttempt')
        .where('questionSetAttempt.userId = :userId', { userId: user?.sub })
        .andWhere('questionSetAttempt.questionSetId = :questionSetId', {
          questionSetId: questionSet.id,
        })
        .getCount();

      // Determine the new attempt number
      const newAttemptNumber = existingAttemptsCount + 1;

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
        attemptNumber: newAttemptNumber,
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

  // Question Set Attempts per student
  async getQuestionSetAttempts(
    page: number,
    limit: number,
    search?: string,
    status?: string,
  ) {
    const user = this.request.user;

    const skip = (page - 1) * limit;

    const query = this.questionSetAttemptsRepository
      .createQueryBuilder('questionSetAttempt')
      .leftJoinAndSelect('questionSetAttempt.questionSet', 'questionSet')
      .leftJoinAndSelect('questionSet.category', 'category')
      .where('questionSetAttempt.userId = :userId', { userId: user?.sub })
      .orderBy('questionSetAttempt.completedAt', 'DESC')
      .skip(skip)
      .take(limit);

    if (search) {
      query.andWhere('questionSet.name ILIKE :search', { search });
    }

    if (questionSetAttemptStatuses.includes(status)) {
      if (status === 'pending') {
        query.andWhere('questionSetAttempt.isCompleted = :isCompleted', {
          isCompleted: false,
        });
      }

      if (status === 'in_review') {
        query
          .andWhere('questionSetAttempt.isCompleted = :isCompleted', {
            isCompleted: true,
          })
          .andWhere('questionSetAttempt.isChecked = :isChecked', {
            isChecked: false,
          });
      }

      if (status === 'completed') {
        query
          .andWhere('questionSetAttempt.isCompleted = :isCompleted', {
            isCompleted: true,
          })
          .andWhere('questionSetAttempt.isChecked = :isChecked', {
            isChecked: true,
          });
      }
    }

    const [data, totalItems] = await query.getManyAndCount();

    return {
      success: true,
      message: 'Question set attempts retrieved successful.',
      data,
      totalItems,
      totalPages: Math.ceil(totalItems / limit),
      currentPage: page,
      pageSize: limit,
    };
  }

  // Question Set Attempt for student
  async getQuestionSetAttemptById(questionSetAttemptId: string) {
    const user = this.request.user;
    const questionSetAttempt = await this.questionSetAttemptsRepository
      .createQueryBuilder('questionSetAttempt')
      .leftJoinAndSelect('questionSetAttempt.questionSet', 'questionSet')
      .leftJoinAndSelect('questionSet.category', 'category')
      .leftJoin('questionSetAttempt.questionAttempts', 'questionAttempt')
      .leftJoin('questionAttempt.question', 'question')
      .leftJoin('question.options', 'option')
      .leftJoinAndSelect('question.subject', 'subject')
      .leftJoinAndSelect('question.subSubject', 'subSubject')
      .addSelect([
        'questionAttempt.id',
        'questionAttempt.selectedTextAnswer',
        'questionAttempt.selectedBooleanAnswer',
        'questionAttempt.selectedOptionId',
        'questionAttempt.questionId',
        'questionAttempt.createdAt',
        'questionAttempt.updatedAt',
      ])
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
    return {
      success: true,
      message: 'Question set fetch successful.',
      data: questionSetAttempt,
    };
  }

  // Report of the completed question set attempt
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

    if (!questionSetAttempt.questionSet || !questionSetAttempt.questionSet.id) {
      throw new Error('QuestionSet ID not found for the attempt.'); // Or a more specific error
    }

    const totalPossibleScore = questionSetAttempt.questionAttempts.length;

    if (
      totalPossibleScore === undefined ||
      totalPossibleScore === null ||
      totalPossibleScore <= 0
    ) {
      throw new Error(
        'Total number of questions for the Question Set is not defined or is zero/negative. Cannot calculate percentages.',
      );
    }

    const currentAttemptScore = questionSetAttempt.score;
    const currentAttemptPercentage =
      (currentAttemptScore / totalPossibleScore) * 100;

    // 2. Fetch all completed attempts for this specific questionSetId
    const allCompletedAttemptsForSet = await this.questionSetAttemptsRepository
      .createQueryBuilder('questionSetAttempt')
      .select(['questionSetAttempt.score', 'questionSetAttempt.userId']) // Only select score and userId
      .where('questionSetAttempt.questionSetId = :questionSetId', {
        questionSetId: questionSetAttempt.questionSet.id,
      })
      .andWhere('questionSetAttempt.isCompleted = :isCompleted', {
        isCompleted: true,
      })
      .getMany();

    // 3. Process the fetched attempts to get aggregate statistics

    let highestOverallScore = 0;
    let lowestOverallScore = Infinity; // Initialize with a very large number
    let totalOverallScore = 0;
    let overallAttemptCount = 0;

    let userHighestScore = 0;
    let userLowestScore = Infinity;
    let userTotalScore = 0;
    let userAttemptCount = 0;

    for (const attempt of allCompletedAttemptsForSet) {
      const score = attempt.score; // Assuming 'score' field exists

      if (score > highestOverallScore) {
        highestOverallScore = score;
      }
      if (score < lowestOverallScore) {
        lowestOverallScore = score;
      }
      totalOverallScore += score;
      overallAttemptCount++;

      if (attempt.userId === user?.sub) {
        if (score > userHighestScore) {
          userHighestScore = score;
        }
        if (score < userLowestScore) {
          userLowestScore = score;
        }
        userTotalScore += score;
        userAttemptCount++;
      }
    }

    const averageOverAllScore =
      overallAttemptCount > 0 ? totalOverallScore / overallAttemptCount : 0;
    const userAverageScore =
      userAttemptCount > 0 ? userTotalScore / userAttemptCount : 0;

    // Convert scores to percentages
    const highestOverallPercentage =
      (highestOverallScore / totalPossibleScore) * 100;
    const lowestOverallPercentage =
      overallAttemptCount > 0
        ? (lowestOverallScore / totalPossibleScore) * 100
        : 0;
    const averageOverallPercentage =
      (averageOverAllScore / totalPossibleScore) * 100;

    const userHighestPercentage = (userHighestScore / totalPossibleScore) * 100;
    const userLowestPercentage =
      userAttemptCount > 0 ? (userLowestScore / totalPossibleScore) * 100 : 0;
    const userAveragePercentage = (userAverageScore / totalPossibleScore) * 100;

    return {
      success: true,
      message: 'Question set report generated successfully.',
      data: {
        ...questionSetAttempt, // Include all existing details of the current attempt
        reportStatistics: {
          currentAttemptScore: currentAttemptScore,
          currentAttemptPercentage: parseFloat(
            currentAttemptPercentage.toFixed(2),
          ), // Format to 2 decimal places

          // Overall statistics (scores)
          highestOverallScore: highestOverallScore,
          lowestOverallScore: overallAttemptCount > 0 ? lowestOverallScore : 0,
          averageOverAllScore: parseFloat(averageOverAllScore.toFixed(2)),

          // Overall statistics (percentages)
          highestOverallPercentage: parseFloat(
            highestOverallPercentage.toFixed(2),
          ),
          lowestOverallPercentage: parseFloat(
            lowestOverallPercentage.toFixed(2),
          ),
          averageOverallPercentage: parseFloat(
            averageOverallPercentage.toFixed(2),
          ),

          // User-specific statistics (scores)
          userHighestScore: userHighestScore,
          userLowestScore: userAttemptCount > 0 ? userLowestScore : 0,
          userAverageScore: parseFloat(userAverageScore.toFixed(2)),

          // User-specific statistics (percentages)
          userHighestPercentage: parseFloat(userHighestPercentage.toFixed(2)),
          userLowestPercentage: parseFloat(userLowestPercentage.toFixed(2)),
          userAveragePercentage: parseFloat(userAveragePercentage.toFixed(2)),
          totalUserAttempts: userAttemptCount,
          totalOverallAttempts: overallAttemptCount,
        },
      },
    };
  }

  // Status of an question set attempt, remaining time and completed status
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

  // Service to answer questions for Students
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
          userId: user.sub,
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
          questionStats.timesAnsweredCorrectly = questionAttempt?.isCorrect
            ? questionStats.timesAnsweredCorrectly
            : questionStats.timesAnsweredCorrectly + 1;
        } else {
          questionStats.timesAnsweredCorrectly = questionAttempt?.isCorrect
            ? questionStats.timesAnsweredCorrectly - 1
            : questionStats.timesAnsweredCorrectly;
        }

        await queryRunner.manager
          .getRepository(QuestionStats)
          .save(questionStats);
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

  // Service to mark the question set attempt as completed
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
        userId: user.sub,
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

  // Service to complete the quiz automatically if time ends ( Called in getQuestionSetAttemptStatusById service)
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

  // PERMISSION : ADMIN
  /*
    SERVICES FROM HERE ARE FOR ADMINS ONLY
  */
  // List of all the completed but unchecked question set attempts
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

  // Question set attempt to review (To check/ review answers in the question sets that are long or short typed)
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

  // Review answer of unchecked questionAttempt and mark it correct or incorrect
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
        questionStats.timesAnsweredCorrectly += 1;
      }
      // If review changed from correct to incorrect
      else if (previousIsCorrect && !payload.isCorrect) {
        questionStats.timesAnsweredCorrectly -= 1;
      }

      // Save updated stats
      await questionStatRepo.save(questionStats);

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

      const score = allQuestionAttempts.filter((a) => a.isCorrect).length;
      const total = questionSetAttempt.questionSet.questions.length;
      const percentage = total > 0 ? (score / total) * 100 : 0;
      questionSetAttempt.score = score;
      questionSetAttempt.percentage = percentage;
      await questionSetAttemptRepo.save(questionSetAttempt);
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

  // Mark isChecked , marking if the checking of the question set attempt is completed
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
}

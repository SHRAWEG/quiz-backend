import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { InjectRepository } from '@nestjs/typeorm';
import { Request } from 'express';
import { Role } from 'src/common/enums/roles.enum';
import { Repository } from 'typeorm';
import { Question } from '../questions/entities/question.entity';
import { User } from '../users/entities/user.entity';
import { AddQuestionDto } from './dto/add-question-dto';
import { CreateQuestionSetDto } from './dto/create-question-set.dto';
import { UpdateQuestionSetDto } from './dto/update-question-set.dto';
import { QuestionSetPurchase } from './entities/question-set-purchase.entity';
import {
  QuestionSet,
  QuestionSetAccessType,
  QuestionSetStatus,
} from './entities/question-set.entity';

@Injectable()
export class QuestionSetsService {
  constructor(
    @InjectRepository(QuestionSet)
    private readonly questionSetRepository: Repository<QuestionSet>,
    @InjectRepository(Question)
    private readonly questionRepository: Repository<Question>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(QuestionSetPurchase)
    private readonly questionSetPurchaseRepository: Repository<QuestionSetPurchase>,
    @Inject(REQUEST) private readonly request: Request,
  ) {}

  async create(dto: CreateQuestionSetDto) {
    const user = this.request.user;

    const queryRunner =
      this.questionSetRepository.manager.connection.createQueryRunner();
    await queryRunner.startTransaction();

    try {
      const questionSet = new QuestionSet();
      questionSet.name = dto.name;
      questionSet.accessType = dto.accessType;
      questionSet.creditCost =
        dto.accessType === QuestionSetAccessType.EXCLUSIVE
          ? dto.creditCost
          : null;
      questionSet.isTimeLimited = dto.isTimeLimited;
      questionSet.timeLimitSeconds = dto.timeLimitSeconds;
      questionSet.categoryId = dto.categoryId;
      questionSet.status = QuestionSetStatus.DRAFT;
      questionSet.createdById = user.sub;

      const insertedQuestionSet = await queryRunner.manager
        .createQueryBuilder()
        .insert()
        .into(QuestionSet)
        .values(questionSet)
        .returning('*')
        .execute();

      await queryRunner.commitTransaction();

      const newQuestionSet = await queryRunner.manager
        .createQueryBuilder(QuestionSet, 'questionSet')
        .leftJoinAndSelect('questionSet.questions', 'q')
        .where('questionSet.id = :id', {
          id: (insertedQuestionSet.generatedMaps[0].id as string) || '',
        })
        .getOne();

      if (!newQuestionSet) {
        throw new NotFoundException('Created question set not found');
      }

      return {
        success: true,
        message: 'Question set created successfully',
        data: newQuestionSet,
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async addQuestion(dto: AddQuestionDto) {
    const questionSet = await this.questionSetRepository
      .createQueryBuilder('questionSet')
      .leftJoinAndSelect('questionSet.questions', 'question')
      .leftJoinAndSelect(
        'questionSet.questionSetAttempts',
        'questionSetAttempt',
      )
      .where('questionSet.id = :id', { id: dto.questionSetId })
      .getOne();

    if (!questionSet) {
      throw new NotFoundException('Question set not found');
    }

    if (questionSet.questionSetAttempts?.length > 0) {
      throw new BadRequestException(
        'Cannot add a question to the set that has been attempted.',
      );
    }

    if (questionSet?.questions?.some((q) => q.id === dto.questionId)) {
      throw new BadRequestException(
        'The question is already in the question set',
      );
    }

    const question = await this.questionRepository
      .createQueryBuilder('q')
      .where('q.id = :id', { id: dto.questionId })
      .getOne();
    if (!question) {
      throw new NotFoundException('Question not found');
    }

    await this.questionSetRepository
      .createQueryBuilder()
      .relation(QuestionSet, 'questions')
      .of(dto.questionSetId)
      .add(dto.questionId);

    await this.questionSetRepository.update(dto.questionSetId, {
      status: QuestionSetStatus.DRAFT,
    });

    const updatedQuestionSet = await this.questionSetRepository
      .createQueryBuilder('qs')
      .leftJoinAndSelect('qs.questions', 'q')
      .where('qs.id = :id', { id: dto.questionSetId })
      .getOne();

    return {
      success: true,
      message: 'Question added successfully.',
      data: updatedQuestionSet,
    };
  }

  async removeQuestion(dto: AddQuestionDto) {
    const { questionSetId, questionId } = dto;

    const questionSet = await this.questionSetRepository
      .createQueryBuilder('questionSet')
      .leftJoinAndSelect('questionSet.questions', 'question')
      .leftJoinAndSelect(
        'questionSet.questionSetAttempts',
        'questionSetAttempt',
      )
      .where('questionSet.id = :id', { id: questionSetId })
      .getOne();

    if (!questionSet) {
      throw new NotFoundException('Question set not found');
    }

    if (questionSet.questionSetAttempts?.length > 0) {
      throw new BadRequestException(
        'Cannot remove a question from the set that has been attempted.',
      );
    }

    const isLinked = questionSet.questions.some((q) => q.id === questionId);
    if (!isLinked) {
      throw new BadRequestException('Question is not part of the question set');
    }

    const question = await this.questionRepository
      .createQueryBuilder('q')
      .where('q.id = :id', { id: questionId })
      .getOne();
    if (!question) {
      throw new NotFoundException('Question not found');
    }

    await this.questionSetRepository
      .createQueryBuilder()
      .relation(QuestionSet, 'questions')
      .of(questionSetId)
      .remove(questionId);

    await this.questionSetRepository.update(dto.questionSetId, {
      status: QuestionSetStatus.DRAFT,
    });

    const updatedQuestionSet = await this.questionSetRepository
      .createQueryBuilder('qs')
      .leftJoinAndSelect('qs.questions', 'q')
      .where('qs.id = :id', { id: questionSetId })
      .getOne();

    return {
      success: true,
      message: 'Question removed successfully',
      data: updatedQuestionSet,
    };
  }

  async get(
    page: number,
    limit: number,
    search?: string,
    status?: QuestionSetStatus,
  ) {
    const user = this.request.user;
    const skip = (page - 1) * limit;
    const actStatus =
      user.role == Role.STUDENT ? QuestionSetStatus.PUBLISHED : status;

    const query = this.questionSetRepository
      .createQueryBuilder('questionSet')
      .leftJoinAndSelect('questionSet.questions', 'question')
      .leftJoinAndSelect('questionSet.category', 'category')
      .loadRelationCountAndMap(
        'questionSet.questionSetAttemptsCount',
        'questionSet.questionSetAttempts',
      )
      .orderBy('questionSet.createdAt', 'DESC')
      .skip(skip)
      .take(limit);

    if (search) {
      query.andWhere('questionSet.name ILIKE :search', {
        search: `%${search}%`,
      });
    }
    if (Object.values(QuestionSetStatus).includes(actStatus)) {
      query.andWhere('questionSet.status = :status', { status: actStatus });
    }

    const [data, totalItems] = await query.getManyAndCount();

    return {
      success: true,
      message: 'Question Sets retrieved successfully',
      data,
      totalItems,
      totalPages: Math.ceil(totalItems / limit),
      currentPage: page,
      pageSize: limit,
    };
  }

  async getById(id: string) {
    const query = this.questionSetRepository
      .createQueryBuilder('questionSet')
      .leftJoinAndSelect('questionSet.category', 'category')
      .leftJoinAndSelect('questionSet.questions', 'question')
      .leftJoin('questionSet.createdBy', 'user')
      .addSelect([
        'user.id',
        'user.firstName',
        'user.middleName',
        'user.lastName',
        'user.email',
      ])
      .leftJoinAndSelect('question.options', 'option')
      .leftJoinAndSelect('question.subject', 'subject')
      .leftJoin('question.subSubject', 'subSubject')
      .addSelect(['subSubject.id', 'subSubject.name'])
      .where('questionSet.id = :id', { id });

    const questionSet = await query.getOne();

    if (!questionSet) {
      return {
        success: false,
        message: 'Question not found',
        data: null,
      };
    }

    return {
      success: true,
      message: 'Question Set retrieved successfully',
      data: questionSet,
    };
  }

  async getQuestionSetsToAttempt(
    page: number,
    limit: number,
    search?: string,
    categoryId?: string,
  ) {
    const user = this.request.user;
    const skip = (page - 1) * limit;

    const userWithPrefs = await this.userRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.preferredCategories', 'preferredCategory')
      .where('user.id = :userId', { userId: user.sub })
      .getOne();

    const preferredCategoryIds =
      userWithPrefs?.preferredCategories?.map((c) => c.id) ?? [];

    const buildBaseQuery = () => {
      const baseQuery = this.questionSetRepository
        .createQueryBuilder('questionSet')
        .leftJoinAndSelect('questionSet.category', 'category')
        .loadRelationCountAndMap(
          'questionSet.questionsCount',
          'questionSet.questions',
        )
        .loadRelationCountAndMap(
          'questionSet.totalAttempts',
          'questionSet.questionSetAttempts',
        )
        .where('questionSet.status = :status', {
          status: QuestionSetStatus.PUBLISHED,
        });

      if (search) {
        baseQuery.andWhere('questionSet.name ILIKE :search', {
          search: `%${search}%`,
        });
      }

      if (categoryId) {
        baseQuery.andWhere('questionSet.categoryId = :categoryId', {
          categoryId: categoryId,
        });
      }

      return baseQuery;
    };

    if (preferredCategoryIds.length > 0) {
      const preferredQuery = buildBaseQuery()
        .andWhere('questionSet.categoryId IN (:...preferredIds)', {
          preferredIds: preferredCategoryIds,
        })
        .orderBy('questionSet.createdAt', 'DESC');

      const nonPreferredQuery = buildBaseQuery()
        .andWhere('questionSet.categoryId NOT IN (:...preferredIds)', {
          preferredIds: preferredCategoryIds,
        })
        .orderBy('questionSet.createdAt', 'DESC');

      const totalItems = await buildBaseQuery().getCount();
      const [preferredData, nonPreferredData] = await Promise.all([
        preferredQuery.getMany(),
        nonPreferredQuery.getMany(),
      ]);

      const combinedData = [...preferredData, ...nonPreferredData];
      const paginatedData = combinedData.slice(skip, skip + limit);

      return {
        success: true,
        message: 'Question Sets for Quiz/Test retrieved successfully',
        data: paginatedData,
        totalItems,
        totalPages: Math.ceil(totalItems / limit),
        currentPage: page,
        pageSize: limit,
      };
    } else {
      const query = buildBaseQuery().orderBy('questionSet.createdAt', 'DESC');
      query.skip(skip).take(limit);
      const [data, totalItems] = await query.getManyAndCount();

      return {
        success: true,
        message: 'Question Sets for Quiz/Test retrieved successfully',
        data,
        totalItems,
        totalPages: Math.ceil(totalItems / limit),
        currentPage: page,
        pageSize: limit,
      };
    }
  }

  async getQuestionSetToAttempt(id: string) {
    const user = this.request.user;

    const query = this.questionSetRepository
      .createQueryBuilder('questionSet')
      .leftJoinAndSelect('questionSet.category', 'category')
      .leftJoinAndSelect('questionSet.questions', 'question')
      .leftJoin('questionSet.createdBy', 'creator')
      .addSelect([
        'creator.id',
        'creator.firstName',
        'creator.middleName',
        'creator.lastName',
        'creator.email',
      ])
      .leftJoin('question.options', 'option')
      .addSelect(['option.id', 'option.optionText'])
      .leftJoinAndSelect('question.subject', 'subject')
      .leftJoin('question.subSubject', 'subSubject')
      .addSelect(['subSubject.id', 'subSubject.name'])
      .loadRelationCountAndMap(
        'questionSet.totalAttempts',
        'questionSet.questionSetAttempts',
      )
      .loadRelationCountAndMap(
        'questionSet.userAttemptCount',
        'questionSet.questionSetAttempts',
        'userAttempts',
        (qb) =>
          qb.where('userAttempts.userId = :userId', {
            userId: user?.sub,
          }),
      )
      .where('questionSet.id = :id', { id })
      .andWhere('questionSet.status = :status', {
        status: QuestionSetStatus.PUBLISHED,
      });

    const questionSet = await query.getOne();

    if (!questionSet) {
      return {
        success: false,
        message: 'Question not found',
        data: null,
      };
    }

    // Get purchase information for exclusive question sets
    let purchaseInfo: {
      isPurchased: boolean;
      totalPurchases: number;
      unusedPurchases: number;
      purchases: { id: string; purchasedAt: Date; isUsed: boolean }[];
    };
    if (questionSet.accessType === QuestionSetAccessType.EXCLUSIVE) {
      const purchases = await this.questionSetPurchaseRepository.find({
        where: {
          userId: user.sub,
          questionSetId: questionSet.id,
        },
        select: ['id', 'purchasedAt', 'isUsed'],
      });

      purchaseInfo = {
        isPurchased: purchases.length > 0,
        totalPurchases: purchases.length,
        unusedPurchases: purchases.filter((p) => !p.isUsed).length,
        purchases: purchases.map((p) => ({
          id: p.id,
          purchasedAt: p.purchasedAt,
          isUsed: p.isUsed,
        })),
      };
    }

    return {
      success: true,
      message: 'Question Set retrieved successfully',
      data: {
        ...questionSet,
        purchaseInfo,
      },
    };
  }

  async update(id: string, dto: UpdateQuestionSetDto) {
    const questionSet = await this.questionSetRepository
      .createQueryBuilder('questionSet')
      .leftJoinAndSelect(
        'questionSet.questionSetAttempts',
        'questionSetAttempt',
      )
      .where('questionSet.id = :id', { id })
      .getOne();

    if (questionSet === null) {
      throw new NotFoundException('Question Set does not exist');
    }

    if (questionSet.questionSetAttempts?.length > 0) {
      throw new BadRequestException(
        'Cannot update a question set that has been attempted.',
      );
    }

    // Ensure creditCost is only set for exclusive sets
    if (
      dto.accessType !== QuestionSetAccessType.EXCLUSIVE &&
      dto.creditCost !== undefined
    ) {
      throw new BadRequestException(
        'Credit cost can only be set for exclusive question sets',
      );
    }

    const result = await this.questionSetRepository
      .createQueryBuilder()
      .update(QuestionSet)
      .set({ ...dto })
      .where('id = :id', { id })
      .execute();

    return {
      id,
      message: 'Question set updated successfully',
      data: result,
    };
  }

  async publish(id: string) {
    const exists = await this.questionSetRepository
      .createQueryBuilder('qs')
      .where('qs.id = :id', { id })
      .getExists();

    if (!exists) {
      throw new NotFoundException('Question Set does not exist');
    }
    const updatedQuestionSet = await this.questionSetRepository
      .createQueryBuilder()
      .update(QuestionSet)
      .set({ status: QuestionSetStatus.PUBLISHED })
      .where('id = :id', { id })
      .execute();
    return {
      success: true,
      message: 'Question set published successfully',
      data: updatedQuestionSet,
    };
  }

  async draft(id: string) {
    const questionSet = await this.questionSetRepository
      .createQueryBuilder('questionSet')
      .leftJoinAndSelect(
        'questionSet.questionSetAttempts',
        'questionSetAttempt',
      )
      .where('questionSet.id = :id', { id })
      .getOne();

    if (!questionSet) {
      throw new NotFoundException('Question Set does not exist');
    }

    if (questionSet.questionSetAttempts?.length > 0) {
      throw new BadRequestException(
        'Cannot draft a question set that has been attempted.',
      );
    }

    const updatedQuestionSet = await this.questionSetRepository
      .createQueryBuilder()
      .update(QuestionSet)
      .set({ status: QuestionSetStatus.DRAFT })
      .where('id = :id', { id })
      .execute();
    return {
      success: true,
      message: 'Question set drafted successfully',
      data: updatedQuestionSet,
    };
  }

  async delete(id: string) {
    const questionSet = await this.questionSetRepository
      .createQueryBuilder('questionSet')
      .leftJoinAndSelect('questionSet.questionSetAttempts', 'attempt')
      .where('questionSet.id = :id', { id })
      .getOne();

    if (!questionSet) {
      throw new NotFoundException('QuestionSet not found');
    }

    if (questionSet.questionSetAttempts?.length > 0) {
      throw new BadRequestException(
        'Cannot delete a question set that has been attempted.',
      );
    }

    await this.questionSetRepository
      .createQueryBuilder()
      .delete()
      .from(QuestionSet)
      .where('id = :id', { id })
      .execute();

    return {
      success: true,
      message: 'Question set deleted successfully',
      data: id,
    };
  }
}

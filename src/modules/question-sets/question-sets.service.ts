// question-set.service.ts

import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { InjectRepository } from '@nestjs/typeorm';
import { Request } from 'express';
import { Repository } from 'typeorm';
import { Question } from '../questions/entities/question.entity';
import { AddQuestionDto } from './dto/add-question-dto';
import { CreateQuestionSetDto } from './dto/create-question-set.dto';
import { UpdateQuestionSetDto } from './dto/update-question-set.dto';
import { QuestionSet, QuestionSetStatus } from './entities/question-set.entity';

@Injectable()
export class QuestionSetsService {
  constructor(
    @InjectRepository(QuestionSet)
    private readonly questionSetRepository: Repository<QuestionSet>,
    @InjectRepository(Question)
    private readonly questionRepository: Repository<Question>,
    @Inject(REQUEST) private readonly request: Request,
  ) {}

  async create(dto: CreateQuestionSetDto): Promise<QuestionSet> {
    const user = this.request.user;

    // Start a transaction for creating the QuestionSet and any related entries
    const queryRunner =
      this.questionSetRepository.manager.connection.createQueryRunner();

    // Start the transaction
    await queryRunner.startTransaction();
    try {
      // 1. Create the QuestionSet entity
      const questionSet = new QuestionSet();
      questionSet.name = dto.name;
      questionSet.isFree = dto.isFree;
      questionSet.categoryId = dto.categoryId;
      questionSet.status = QuestionSetStatus.DRAFT;
      questionSet.createdById = user!.sub;

      // 2. Insert the QuestionSet
      const insertedQuestionSet = await queryRunner.manager
        .createQueryBuilder()
        .insert()
        .into(QuestionSet)
        .values(questionSet)
        .returning('*') // Return the inserted data
        .execute();

      // Commit the transaction
      await queryRunner.commitTransaction();

      // Retrieve the created QuestionSet with its questions (if any)
      const newQuestionSet = await queryRunner.manager
        .createQueryBuilder(QuestionSet, 'qs')
        .leftJoinAndSelect('qs.questions', 'q')
        .where('qs.id = :id', {
          id: (insertedQuestionSet.generatedMaps[0].id as string) || '',
        })
        .getOne();

      if (!newQuestionSet) {
        throw new NotFoundException('Created question set not found');
      }

      return newQuestionSet;
    } catch (error) {
      // If any error occurs, rollback the transaction
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      // Release the query runner after the transaction
      await queryRunner.release();
    }
  }

  async addQuestion(dto: AddQuestionDto) {
    // 1. Load the QuestionSet with its related Question IDs
    const questionSet = await this.questionSetRepository
      .createQueryBuilder('questionSet')
      .leftJoinAndSelect('questionSet.questions', 'question') // This automatically joins the relation via the join table
      .leftJoinAndSelect('question.options', 'option')
      .where('questionSet.id = :id', { id: dto.questionSetId })
      .getOne();

    if (!questionSet) {
      throw new NotFoundException('Question set not found');
    }

    // 2. Check if the question is already linked
    if (questionSet?.questions?.some((q) => q.id === dto.questionId)) {
      // Question with the given ID exists in the questionSet
      throw new BadRequestException(
        'The question is already in the question set',
      );
    }

    // 3. Confirm the Question exists (optional, but good for safety)
    const question = await this.questionRepository
      .createQueryBuilder('q')
      .where('q.id = :id', { id: dto.questionId })
      .getOne();
    if (!question) {
      throw new NotFoundException('Question not found');
    }

    // 4. Insert into the join table manually using QueryBuilder
    await this.questionSetRepository
      .createQueryBuilder()
      .relation(QuestionSet, 'questions')
      .of(dto.questionSetId)
      .add(dto.questionId); // Adds the relation

    // ✅ 5. Update the question set status to DRAFT
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

    // 1. Load QuestionSet with its questions
    const questionSet = await this.questionSetRepository
      .createQueryBuilder('questionSet')
      .leftJoinAndSelect('questionSet.questions', 'question')
      .where('questionSet.id = :id', { id: questionSetId })
      .getOne();

    if (!questionSet) {
      throw new NotFoundException('Question set not found');
    }

    // 2. Check if question is actually linked
    const isLinked = questionSet.questions.some((q) => q.id === questionId);
    if (!isLinked) {
      throw new BadRequestException('Question is not part of the question set');
    }

    // 3. Ensure the question exists
    const question = await this.questionRepository
      .createQueryBuilder('q')
      .where('q.id = :id', { id: questionId })
      .getOne();
    if (!question) {
      throw new NotFoundException('Question not found');
    }

    // 4. Remove the relation using QueryBuilder
    await this.questionSetRepository
      .createQueryBuilder()
      .relation(QuestionSet, 'questions')
      .of(questionSetId)
      .remove(questionId);

    // ✅ 5. Update the question set status to DRAFT
    await this.questionSetRepository.update(dto.questionSetId, {
      status: QuestionSetStatus.DRAFT,
    });

    // 5. Return updated question set with full question details
    const updatedQuestionSet = await this.questionSetRepository
      .createQueryBuilder('qs')
      .leftJoinAndSelect('qs.questions', 'q')
      .where('qs.id = :id', { id: questionSetId })
      .getOne();

    return updatedQuestionSet;
  }

  async get(
    page: number,
    limit: number,
    search?: string,
    status?: QuestionSetStatus,
  ) {
    const skip = (page - 1) * limit;

    const query = this.questionSetRepository
      .createQueryBuilder('questionSet')
      .leftJoinAndSelect('questionSet.questions', 'question')
      .leftJoinAndSelect('questionSet.category', 'category')
      .orderBy('questionSet.createdAt', 'DESC')
      .skip(skip)
      .take(limit);

    if (search) {
      query.andWhere('questionSet.name ILIKE :search', {
        search: `%${search}%`,
      });
    }
    if (
      Object.values(QuestionSetStatus).includes(status as QuestionSetStatus)
    ) {
      query.andWhere('questionSet.status = :status', { status });
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
      .leftJoinAndSelect('question.subject', 'subject') // join but not select
      .leftJoin('question.subSubject', 'subSubject') // join but not select
      .addSelect(['subSubject.id', 'subSubject.name']) // project only needed fields
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

  async update(id: string, dto: UpdateQuestionSetDto) {
    // 1. Check if the question set exists
    const exists = await this.questionSetRepository
      .createQueryBuilder('qs')
      .where('qs.id = :id', { id })
      .getExists();

    if (!exists) {
      throw new NotFoundException('Question Set does not exist');
    }

    // 2. Perform update
    const result = await this.questionSetRepository
      .createQueryBuilder()
      .update(QuestionSet)
      .set({ ...dto })
      .where('id = :id', { id })
      .execute();

    return {
      id,
      data: result,
    };
  }

  async publish(id: string) {
    const query = this.questionSetRepository
      .createQueryBuilder('questionSet')
      .where('questionSet.id = :id', { id });
    const questionSet = await query.getOne();
    if (!questionSet) {
      throw new NotFoundException('Question Set does not exist');
    }
    const updatedQuestionSet = await query
      .update()
      .set({ status: QuestionSetStatus.PUBLISHED })
      .execute();
    return {
      id: id,
      data: updatedQuestionSet,
    };
  }

  async draft(id: string) {
    const query = this.questionSetRepository
      .createQueryBuilder('questionSet')
      .where('questionSet.id = :id', { id });
    const questionSet = await query.getOne();
    if (!questionSet) {
      throw new NotFoundException('Question Set does not exist');
    }
    const updatedQuestionSet = await query
      .update()
      .set({ status: QuestionSetStatus.DRAFT })
      .execute();
    return {
      id: id,
      data: updatedQuestionSet,
    };
  }

  // DELETE QuestionSet by ID
  async delete(id: string) {
    const questionSet = await this.questionSetRepository
      .createQueryBuilder('questionSet')
      .where('questionSet.id = :id', { id })
      .getOne();

    if (!questionSet) {
      throw new NotFoundException('QuestionSet not found');
    }

    await this.questionSetRepository
      .createQueryBuilder()
      .delete()
      .from(QuestionSet)
      .where('id = :id', { id })
      .execute();
    return {
      success: true,
      message: 'Question set deleted succesfully',
      data: id,
    };
  }
}

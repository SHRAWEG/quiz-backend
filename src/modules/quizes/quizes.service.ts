import { Inject, Injectable } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  QuestionSet,
  QuestionSetStatus,
} from '../question-sets/entities/question-set.entity';
import { Question } from '../questions/entities/question.entity';

@Injectable()
export class QuizesService {
  constructor(
    @InjectRepository(QuestionSet)
    private readonly questionSetRepository: Repository<QuestionSet>,
    @InjectRepository(Question)
    private readonly questionRepository: Repository<Question>,
    @Inject(REQUEST) private readonly request: Request,
  ) {}

  async get(page: number, limit: number, search?: string) {
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
    query.andWhere('questionSet.status = :status', {
      status: QuestionSetStatus.PUBLISHED,
    });

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
}

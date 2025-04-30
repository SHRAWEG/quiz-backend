// question-set.service.ts

import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Question } from '../questions/entities/question.entity';
import { CreateQuestionSetDto } from './dto/create-question-set.dto';
import { QuestionSet } from './entities/question-set.entity';

@Injectable()
export class QuestionSetsService {
  constructor(
    @InjectRepository(QuestionSet)
    private readonly questionSetRepository: Repository<QuestionSet>,
    private readonly dataSource: DataSource,
  ) {}

  async create(dto: CreateQuestionSetDto): Promise<QuestionSet> {
    const { name, questionIds } = dto;

    const questions = await this.dataSource
      .getRepository(Question)
      .createQueryBuilder('q')
      .where('q.id IN (:...ids)', { ids: questionIds })
      .getMany();

    // Just in case somehow @IdExists passed but actual lookup fails
    if (questions.length !== questionIds.length) {
      throw new NotFoundException('Some questions not found (controller)');
    }

    const questionSet = this.questionSetRepository.create({ name, questions });

    return await this.questionSetRepository.save(questionSet);
  }

  async get(page: number, limit: number, search?: string) {
    const skip = (page - 1) * limit;

    const query = this.questionSetRepository
      .createQueryBuilder('questionSet')
      .leftJoinAndSelect('questionSet.questions', 'question') // Fixed: `questions` not `Question`
      .orderBy('question.createdAt', 'DESC') // Ensure ordering of questions if needed
      .skip(skip)
      .take(limit);

    if (search) {
      query.andWhere('questionSet.name ILIKE :search', {
        search: `%${search}%`,
      });
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

  async search(search: string) {
    const query = this.questionSetRepository
      .createQueryBuilder('questionSet')
      .leftJoinAndSelect('questionSet.questions', 'question')
      .orderBy('question.createdAt', 'DESC');

    if (search) {
      query.andWhere('questionSet.name ILIKE :search', {
        search: `%${search}%`,
      });
    }

    const questionSets = await query.getMany();

    return {
      success: true,
      message: 'Question sets search result',
      data: questionSets,
    };
  }

  async getById(id: string) {
    const query = this.questionSetRepository
      .createQueryBuilder('questionSet')
      .leftJoinAndSelect('questionSet.questions', 'question')
      .where('question.id = :id', { id });

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

  // DELETE QuestionSet by ID
  async delete(id: number): Promise<void> {
    const questionSet = await this.questionSetRepository
      .createQueryBuilder('set')
      .where('set.id = :id', { id })
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
  }
}

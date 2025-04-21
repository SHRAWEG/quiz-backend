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
    private readonly questionSetRepo: Repository<QuestionSet>,
    private readonly dataSource: DataSource,
  ) {}

  // CREATE QuestionSet with questions
  async create(dto: CreateQuestionSetDto): Promise<QuestionSet> {
    const { name, questionIds } = dto;

    const questions = await this.dataSource
      .getRepository(Question)
      .createQueryBuilder('q')
      .where('q.id IN (:...ids)', { ids: questionIds })
      .getMany();

    // Just in case somehow @IdExists passed but actual lookup fails
    if (questions.length !== questionIds.length) {
      throw new NotFoundException('Some questions not found');
    }

    const questionSet = this.questionSetRepo.create({ name, questions });

    return await this.questionSetRepo.save(questionSet);
  }

  // GET all QuestionSets with questions
  async findAll(): Promise<QuestionSet[]> {
    return await this.questionSetRepo
      .createQueryBuilder('set')
      .leftJoinAndSelect('set.questions', 'question')
      .getMany();
  }

  // DELETE QuestionSet by ID
  async delete(id: number): Promise<void> {
    const questionSet = await this.questionSetRepo
      .createQueryBuilder('set')
      .where('set.id = :id', { id })
      .getOne();

    if (!questionSet) {
      throw new NotFoundException('QuestionSet not found');
    }

    await this.questionSetRepo
      .createQueryBuilder()
      .delete()
      .from(QuestionSet)
      .where('id = :id', { id })
      .execute();
  }
}

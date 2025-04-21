import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ApiResponse } from 'src/common/classes/api-response';
import { Repository } from 'typeorm';
import { Option } from '../options/entities/option.entity';
import { SubSubjectsService } from '../sub-subjects/sub-subjects.service';
import { CreateQuestionDto } from './dto/create-question.dto';
import { UpdateQuestionDto } from './dto/update-question.dto';
import { Question, QuestionStatus } from './entities/question.entity';

@Injectable()
export class QuestionsService {
  constructor(
    @InjectRepository(Question)
    private readonly questionsRepository: Repository<Question>,
    @InjectRepository(Option)
    private readonly optionsRepository: Repository<Option>,
    private readonly subSubjectService: SubSubjectsService,
  ) {}

  async create(
    dto: CreateQuestionDto,
    id: string,
  ): Promise<ApiResponse<object>> {
    const { options, ...questionData } = dto;

    const optionsToCreate = options.map((opt) =>
      this.optionsRepository.create({
        option: opt.option,
        isCorrect: opt.isCorrect,
      }),
    );

    const subSubject = await this.subSubjectService.getById(
      questionData.subSubjectId,
    );

    const newQuestion = this.questionsRepository.create({
      ...questionData,
      subjectId: subSubject?.data?.subjectId,
      options: optionsToCreate,
      createdById: id,
    });

    const savedQuestion = await this.questionsRepository.save(newQuestion);

    return {
      success: true,
      message: 'Question created successfully',
      data: savedQuestion,
    };
  }

  async get(
    page: number,
    limit: number,
    search?: string,
    subjectId?: string,
    subSubjectId?: string,
  ) {
    const skip = (page - 1) * limit;

    const query = this.questionsRepository
      .createQueryBuilder('question')
      .leftJoinAndSelect('question.subject', 'subject')
      .leftJoinAndSelect('question.subSubject', 'subSubject')
      .leftJoinAndSelect('question.createdBy', 'createdBy')
      .leftJoinAndSelect('question.processedBy', 'processedBy')
      .leftJoinAndSelect('question.options', 'options')
      .skip(skip)
      .take(limit);

    if (search) {
      query.andWhere('question.question ILIKE :search', {
        search: `%${search}%`,
      });
    }
    if (subjectId) {
      query.andWhere('question.subjectId = :subjectId', { subjectId });
    }
    if (subSubjectId) {
      query.andWhere('question.subSubjectId = :subSubjectId', { subSubjectId });
    }

    const [data, totalItems] = await query.getManyAndCount();

    return {
      success: true,
      message: 'Questions retrieved successfully',
      data,
      totalItems,
      totalPages: Math.ceil(totalItems / limit),
      currentPage: page,
      pageSize: limit,
    };
  }

  async search(search: string, subjectId: string, subSubjectId: string) {
    const query = this.questionsRepository
      .createQueryBuilder('question')
      .leftJoinAndSelect('question.subSubject', 'subSubject')
      .leftJoinAndSelect('question.options', 'options');

    if (search) {
      query.andWhere('question.question ILIKE :search', {
        search: `%${search}%`,
      });
    }
    if (subjectId) {
      query.andWhere('question.subjectId = :subjectId', { subjectId });
    }
    if (subSubjectId) {
      query.andWhere('question.subSubjectId = :subSubjectId', { subSubjectId });
    }

    const questions = await query.getMany();

    return {
      success: true,
      message: 'Questions search result',
      data: questions,
    };
  }

  async getById(id: string) {
    const question = await this.questionsRepository
      .createQueryBuilder('question')
      .leftJoinAndSelect('question.subject', 'subject')
      .leftJoinAndSelect('question.subSubject', 'subSubject')
      .leftJoinAndSelect('question.createdBy', 'createdBy')
      .leftJoinAndSelect('question.processedBy', 'processedBy')
      .leftJoinAndSelect('question.options', 'options')
      .where('question.id = :id', { id })
      .getOne();

    return {
      success: true,
      message: 'Question retrieved successfully',
      data: question,
    };
  }

  async update(id: string, updateDto: UpdateQuestionDto) {
    const { options, ...questionData } = updateDto;

    await this.optionsRepository
      .createQueryBuilder()
      .delete()
      .where('question_id = :id', { id })
      .execute();

    await this.questionsRepository
      .createQueryBuilder()
      .update()
      .set(questionData)
      .where('id = :id', { id })
      .execute();

    if (options && options.length > 0) {
      const newOptions = options.map((option) => ({
        ...option,
        question: { id },
      }));

      await this.optionsRepository
        .createQueryBuilder()
        .insert()
        .into(Option)
        .values(newOptions)
        .execute();
    }

    const updatedQuestion = await this.questionsRepository
      .createQueryBuilder('question')
      .leftJoinAndSelect('question.subject', 'subject')
      .leftJoinAndSelect('question.subSubject', 'subSubject')
      .leftJoinAndSelect('question.createdBy', 'createdBy')
      .leftJoinAndSelect('question.processedBy', 'processedBy')
      .leftJoinAndSelect('question.options', 'options')
      .where('question.id = :id', { id })
      .getOne();

    return {
      success: true,
      message: 'Question updated successfully',
      data: updatedQuestion,
    };
  }

  async approveQuestion(id: string, processedById: string) {
    const result = await this.questionsRepository
      .createQueryBuilder()
      .update()
      .set({
        status: QuestionStatus.APPROVED,
        processedById,
      })
      .where('id = :id', { id })
      .execute();

    if (result.affected === 0) {
      throw new NotFoundException(`Question with ID ${id} not found`);
    }

    return {
      success: true,
      message: 'Question approved successfully',
      data: { affected: result.affected },
    };
  }

  async rejectQuestion(id: string, processedById: string) {
    const result = await this.questionsRepository
      .createQueryBuilder()
      .update()
      .set({
        status: QuestionStatus.REJECTED,
        processedById,
      })
      .where('id = :id', { id })
      .execute();

    if (result.affected === 0) {
      throw new NotFoundException(`Question with ID ${id} not found`);
    }

    return {
      success: true,
      message: 'Question rejected successfully',
      data: { affected: result.affected },
    };
  }

  async delete(id: string) {
    const result = await this.questionsRepository
      .createQueryBuilder()
      .delete()
      .where('id = :id', { id })
      .execute();

    return {
      success: true,
      message: 'Question deleted successfully',
      data: { affected: result.affected },
    };
  }
}

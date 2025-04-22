import {
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { InjectRepository } from '@nestjs/typeorm';
import { Request } from 'express';
import { ApiResponse } from 'src/common/classes/api-response';
import { Role } from 'src/common/enums/roles.enum';
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
    @Inject(REQUEST) private readonly request: Request,
  ) {}

  async create(dto: CreateQuestionDto): Promise<ApiResponse<object>> {
    const user = this.request.user;
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
      createdById: user?.sub,
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
    const user = this.request?.user;
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
    if (user?.role !== Role.Admin) {
      query.andWhere('question.createdById = :userId', { userId: user?.sub });
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
    const user = this.request?.user;
    const query = this.questionsRepository
      .createQueryBuilder('question')
      .leftJoinAndSelect('question.subject', 'subject')
      .leftJoinAndSelect('question.subSubject', 'subSubject')
      .leftJoinAndSelect('question.createdBy', 'createdBy')
      .leftJoinAndSelect('question.processedBy', 'processedBy')
      .leftJoinAndSelect('question.options', 'options')
      .where('question.id = :id', { id });

    if (user?.role !== Role.Admin) {
      query.andWhere('question.createdById = :userId', { userId: user?.sub });
    }
    const question = await query.getOne();

    if (!question) {
      return {
        success: false,
        message: 'Question not found',
        data: null,
      };
    }

    if (user?.role !== Role.Admin) {
      if (question.createdById !== user?.sub) {
        return {
          success: false,
          message: 'You are not authorized to view this question',
          data: null,
        };
      }
    }

    return {
      success: true,
      message: 'Question retrieved successfully',
      data: question,
    };
  }

  async update(id: string, updateDto: UpdateQuestionDto) {
    const user = this.request?.user;
    if (!user) {
      throw new UnauthorizedException('User not authenticated');
    }

    const { options, ...questionData } = updateDto;

    // First, check ownership
    const question = await this.questionsRepository.findOne({
      where: { id, createdBy: { id: user.sub } },
    });

    if (!question) {
      return {
        success: false,
        message: 'Question not found',
        data: null,
      };
    }

    // Update question details
    await this.questionsRepository
      .createQueryBuilder()
      .update()
      .set(questionData)
      .where('id = :id', { id })
      .execute();

    // Handle options (remove old ones and insert new)
    if (options && options.length > 0) {
      await this.optionsRepository
        .createQueryBuilder()
        .delete()
        .where('questionId = :id', { id })
        .execute();

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

    // Fetch updated question
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

  async approveQuestion(id: string) {
    const user = this.request?.user;
    const result = await this.questionsRepository
      .createQueryBuilder()
      .update()
      .set({
        status: QuestionStatus.APPROVED,
        processedById: user?.sub,
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

  async rejectQuestion(id: string) {
    const user = this.request?.user;
    const result = await this.questionsRepository
      .createQueryBuilder()
      .update()
      .set({
        status: QuestionStatus.REJECTED,
        processedById: user?.sub,
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
    const user = this.request?.user;

    const result = await this.questionsRepository
      .createQueryBuilder()
      .delete()
      .from(Question)
      .where('id = :id', { id })
      .andWhere('createdById = :userId', { userId: user?.sub })
      .execute();

    if (result.affected === 0) {
      throw new ForbiddenException(
        'You are not authorized to delete this question or it does not exist.',
      );
    }

    return {
      success: true,
      message: 'Question deleted successfully',
      data: { affected: result.affected },
    };
  }
}

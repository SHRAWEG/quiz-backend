import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ApiResponse } from 'src/common/classes/api-response';
import { Repository } from 'typeorm';
import { Option } from '../options/entities/option.entity';
import { SubSubjectsService } from '../sub-subjects/sub-subjects.service';
import { CreateQuestionDto } from './dto/create-question.dto';
import { Question } from './entities/question.entity';

@Injectable()
export class QuestionsService {
  constructor(
    @InjectRepository(Question)
    private readonly questionsRepository: Repository<Question>,
    @InjectRepository(Option)
    private readonly optionsRepoitory: Repository<Option>,
    // @Inject(forwardRef(() => SubSubjectsService)) // <-- wrap QuestionsService injection
    private readonly subSubjectService: SubSubjectsService,
  ) {}

  // CREATE
  async create(
    dto: CreateQuestionDto,
    id: string,
  ): Promise<ApiResponse<object>> {
    const { options: options, ...questionData } = dto;

    const optionsToCreate = options.map((opt) => {
      return this.optionsRepoitory.create({
        option: opt.option,
        isCorrect: opt.isCorrect,
      });
    });

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
      message: 'Question and options created successfully',
      data: savedQuestion,
    };
  }

  // READ
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

    const [questions, totalItems] = await query.getManyAndCount();

    return {
      questions,
      totalItems,
      totalPages: Math.ceil(totalItems / limit),
      currentPage: page,
      pageSize: limit,
    };
  }

  async search(search: string, subjectId: string, subSubjectId: string) {
    const query = this.questionsRepository
      .createQueryBuilder('question')
      .leftJoinAndSelect('question.options', 'options');

    if (search) {
      query.andWhere('subSubject.name ILIKE :search', {
        search: `%${search}%`,
      });
    }
    if (subjectId) {
      query.andWhere('subSubject.subject_id = :subjectId', {
        subjectId,
      });
    }
    if (subSubjectId) {
      query.andWhere('subSubject.sub_subject_id = :subSubjectId', {
        subjectId,
      });
    }

    const questions = await query.getMany();

    return {
      data: questions,
    };
  }

  async getById(id: string) {
    const query = this.questionsRepository
      .createQueryBuilder('question')
      .leftJoinAndSelect('question.subject', 'subject')
      .leftJoinAndSelect('question.subSubject', 'subSubject')
      .leftJoinAndSelect('question.createdBy', 'createdBy')
      .leftJoinAndSelect('question.processedBy', 'processedBy')
      .leftJoinAndSelect('question.options', 'options')
      .where('question.id = :id', { id })
      .getOne();

    const questions = await query;
    return {
      success: true,
      message: 'Questions retrieved successfully',
      data: questions,
    };
  }

  // async update(id: string, updateQuestionDto: UpdateQuestionDto) {
  //   await this.questionsRepository
  //     .createQueryBuilder()
  //     .update()
  //     .set(updateQuestionDto)
  //     .where('id = :id', { id })
  //     .execute();

  //   return {
  //     success: true,
  //     message: 'Question updated successfully',
  //     data: {
  //       id,
  //       ...updateQuestionDto,
  //     },
  //   };
  // }

  async delete(id: string) {
    const query = this.questionsRepository
      .createQueryBuilder()
      .delete()
      .where('id = :id', { id });

    const deletedQuestion = await query.execute();
    return {
      success: true,
      message: 'Sub Subject deleted successfully',
      data: deletedQuestion,
    };
  }
}

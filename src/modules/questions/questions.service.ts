import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ApiResponse } from 'src/common/classes/api-response';
import { ILike, Repository } from 'typeorm';
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
  async get(page: number, limit: number, search: string) {
    const skip = (page - 1) * limit;
    const findOptions: {
      skip: number;
      take: number;
      where?: { question: any };
    } = {
      skip,
      take: limit,
    };
    if (search) {
      findOptions.where = {
        question: ILike(`%${search}%`),
      };
    }
    const [questions, totalItems] =
      await this.questionsRepository.findAndCount(findOptions);
    const totalPages = Math.ceil(totalItems / limit);
    return {
      questions,
      totalItems,
      totalPages,
      currentPage: page,
      pageSize: limit,
    };
  }
  async getQuestionsBysbSubjectId(subSubjectId: string) {
    const questions = await this.questionsRepository.find({
      where: { subSubjectId },
      relations: ['options'],
    });
    return {
      success: true,
      message: 'Questions retrieved successfully',
      data: questions,
    };
  }
}

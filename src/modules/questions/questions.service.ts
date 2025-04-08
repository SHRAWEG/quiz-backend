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
    private readonly optionsRepo: Repository<Option>,
    // @Inject(forwardRef(() => SubSubjectsService)) // <-- wrap QuestionsService injection
    private readonly subSubjectService: SubSubjectsService,
  ) {}

  async createQuestion(dto: CreateQuestionDto): Promise<ApiResponse<object>> {
    const { options: options, ...questionData } = dto;

    const optionsToCreate = options.map((opt) => {
      return this.optionsRepo.create({
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
    });

    // if (!subSubject) {
    //   return {
    //     success: false,
    //     message: 'Sub-subject not found',
    //   };
    // }
    const savedQuestion = await this.questionsRepository.save(newQuestion);

    return {
      success: true,
      message: 'Question and options created successfully',
      data: savedQuestion,
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

import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { InjectRepository } from '@nestjs/typeorm';
import { Request } from 'express';
import { ApiResponse } from 'src/common/classes/api-response';
import { QuestionStatus, QuestionType } from 'src/common/enums/question.enum';
import { Role } from 'src/common/enums/roles.enum';
import { ValidationException } from 'src/common/exceptions/validation.exception';
import { DataSource, Repository } from 'typeorm';
import { Option } from '../options/entities/option.entity';
import { SubSubjectsService } from '../sub-subjects/sub-subjects.service';
import { CreateQuestionDto } from './dto/create-question.dto';
import { UpdateQuestionDto } from './dto/update-question.dto';
import { Question } from './entities/question.entity';

@Injectable()
export class QuestionsService {
  constructor(
    @InjectRepository(Question)
    private readonly questionsRepository: Repository<Question>,
    @InjectRepository(Option)
    private readonly optionsRepository: Repository<Option>,
    private readonly subSubjectService: SubSubjectsService,
    @Inject(REQUEST) private readonly request: Request,
    private dataSource: DataSource,
  ) {}

  async create(dto: CreateQuestionDto): Promise<ApiResponse<object>> {
    const user = this.request.user;

    const {
      options,
      correctAnswerBoolean,
      correctAnswerText,
      type,
      ...questionData
    } = dto;

    // const validationErrors: ValidationError = {};
    const validationErrors: Record<string, string[]> = {};

    const subSubject = await this.subSubjectService.getById(
      questionData.subSubjectId,
    );

    // Create base question entity
    const baseQuestion = this.questionsRepository.create({
      ...questionData,
      type,
      subjectId: subSubject?.data?.subjectId,
      createdById: user?.sub,
    });

    switch (type) {
      case QuestionType.MCQ:
        if (options) {
          const texts = options.map((opt) => opt.option?.trim().toLowerCase());
          const unique = new Set(texts);
          const correctCount = options.filter(
            (opt) => opt.isCorrect === true,
          ).length;
          if (unique.size !== 4) {
            validationErrors['options'] = ['Options must be unique.'];
          }
          if (correctCount !== 1) {
            validationErrors['options'] = [
              ...(validationErrors['options'] || []),
              'Options must have only 1 correct option.',
            ];
          }
          if (!validationErrors || Object.keys(validationErrors).length == 0) {
            baseQuestion.options =
              options &&
              options.map((opt) =>
                this.optionsRepository.create({
                  option_text: opt.option,
                  isCorrect: opt.isCorrect,
                }),
              );
          }
        } else {
          validationErrors['options'] = [
            'Options are required for Question type MCQ',
          ];
        }
        break;
      case QuestionType.TRUE_OR_FALSE:
        if (typeof correctAnswerBoolean != 'boolean') {
          validationErrors['correctAnswerBoolean'] = [
            'Correct answer is required got question type True or False',
          ];
        }
        if (!validationErrors || Object.keys(validationErrors).length == 0) {
          baseQuestion.correctAnswerBoolean = correctAnswerBoolean;
        }
        break;
      case QuestionType.FILL_IN_THE_BLANKS:
        if (!correctAnswerText) {
          validationErrors['correctAnswerText'] = [
            'Correct ansert is required for question type Fill in the blanks',
          ];
        }
        if (!validationErrors || Object.keys(validationErrors).length == 0) {
          baseQuestion.correctAnswerText = correctAnswerText;
        }
        break;
    }

    // Throw error if any
    if (validationErrors && Object.keys(validationErrors).length > 0) {
      throw new ValidationException(validationErrors);
    }

    // Save the question
    const savedQuestion = await this.questionsRepository.save(baseQuestion);

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
    status?: string,
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
      .orderBy('question.createdAt', 'DESC')
      .skip(skip)
      .take(limit);

    if (search) {
      query.andWhere('question.question ILIKE :search', {
        search: `%${search}%`,
      });
    }
    if (Object.values(QuestionStatus).includes(status as QuestionStatus)) {
      query.andWhere('question.status = :status', { status });
    }
    if (subjectId) {
      query.andWhere('question.subjectId = :subjectId', { subjectId });
    }
    if (subSubjectId) {
      query.andWhere('question.subSubjectId = :subSubjectId', { subSubjectId });
    }
    if (user?.role !== Role.ADMIN) {
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
      .leftJoinAndSelect('question.options', 'options')
      .orderBy('question.createdAt', 'DESC')
      .where('question.status = :status', { status: QuestionStatus.APPROVED });

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

    if (user?.role !== Role.ADMIN) {
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

    if (user?.role !== Role.ADMIN) {
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
    const user = this.request?.user; // First, check ownership

    // CHECK QUESTION AVAILABILITY
    const question = await this.questionsRepository
      .createQueryBuilder('question')
      .where('question.id = :id', { id })
      .andWhere('question.createdById = :userId', { userId: user!.sub })
      .andWhere('question.status != :approved', { approved: 'approved' })
      .getOne();

    if (!question) {
      throw new NotFoundException(
        'Question not found : already approved / you are not the owner of this question.',
      );
      // return {
      //   success: false,
      //   message: 'Question not found',
      //   data: null,
      // };
    }

    const {
      type,
      options,
      correctAnswerBoolean,
      correctAnswerText,
      ...questionData
    } = updateDto;
    const validationErrors: Record<string, string[]> = {};
    const questionDataToUpdate = { ...questionData };

    const queryRunner = this.dataSource.createQueryRunner();

    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      switch (type) {
        case QuestionType.MCQ:
          if (options) {
            const texts = options.map((opt) =>
              opt.option?.trim().toLowerCase(),
            );
            const unique = new Set(texts);
            const correctCount = options.filter(
              (opt) => opt.isCorrect === true,
            ).length;
            if (unique.size !== 4) {
              validationErrors['options'] = ['Options must be unique.'];
            }
            if (correctCount !== 1) {
              validationErrors['options'] = [
                ...(validationErrors['options'] || []),
                'Options must have only 1 correct option.',
              ];
            }
            if (
              !validationErrors ||
              Object.keys(validationErrors).length == 0
            ) {
              // Handle options (remove old ones and insert new)
              await queryRunner.manager
                .createQueryBuilder()
                .delete()
                .from(Option)
                .where('questionId = :id', { id })
                .execute();

              const newOptions = options.map((option) => ({
                ...option,
                question: { id },
              }));

              await queryRunner.manager
                .createQueryBuilder()
                .insert()
                .into(Option)
                .values(newOptions)
                .execute();
            }
          } else {
            validationErrors['options'] = [
              'Options are required for Question type MCQ',
            ];
          }
          break;

        case QuestionType.TRUE_OR_FALSE:
          if (typeof correctAnswerBoolean != 'boolean') {
            validationErrors['correctAnswerBoolean'] = [
              'Correct answer is required got question type True or False',
            ];
          }
          if (!validationErrors || Object.keys(validationErrors).length == 0) {
            questionDataToUpdate['correctAnswerBoolean'] = correctAnswerBoolean;
          }
          break;

        case QuestionType.FILL_IN_THE_BLANKS:
          if (!correctAnswerText) {
            validationErrors['correctAnswerText'] = [
              'Correct ansert is required for question type Fill in the blanks',
            ];
          }
          if (!validationErrors || Object.keys(validationErrors).length == 0) {
            questionDataToUpdate['correctAnswerText'] = correctAnswerText;
          }
          break;
      }

      // Throw error if any
      if (validationErrors && Object.keys(validationErrors).length > 0) {
        throw new ValidationException(validationErrors);
      }

      const subSubject = await this.subSubjectService.getById(
        questionDataToUpdate.subSubjectId,
      );

      // Update question details
      await queryRunner.manager
        .createQueryBuilder()
        .update(Question)
        .set({
          ...questionData,
          subjectId: subSubject?.data?.subjectId,
          status: QuestionStatus.PENDING,
        })
        .where('id = :id', { id })
        .execute();

      // Fetch updated question
      const updatedQuestion = await queryRunner.manager
        .createQueryBuilder(Question, 'question')
        .leftJoinAndSelect('question.subject', 'subject')
        .leftJoinAndSelect('question.subSubject', 'subSubject')
        .leftJoinAndSelect('question.createdBy', 'createdBy')
        .leftJoinAndSelect('question.processedBy', 'processedBy')
        .leftJoinAndSelect('question.options', 'options')
        .where('question.id = :id', { id })
        .getOne();

      await queryRunner.commitTransaction();
      return {
        success: true,
        message: 'Question updated successfully',
        data: updatedQuestion,
      };
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw new BadRequestException(err);
    } finally {
      await queryRunner.release();
    }
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

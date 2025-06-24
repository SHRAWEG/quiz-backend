import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { InjectRepository } from '@nestjs/typeorm';
import * as csv from 'csv-parser';
import { Request } from 'express';
import { ApiResponse } from 'src/common/classes/api-response';
import {
  DifficultyLevel,
  QuestionStatus,
  QuestionType,
} from 'src/common/enums/question.enum';
import { Role } from 'src/common/enums/roles.enum';
import { ValidationException } from 'src/common/exceptions/validation.exception';
import { Readable } from 'stream';
import { DataSource, Repository } from 'typeorm';
import { Option } from '../options/entities/option.entity';
import { SubSubjectsService } from '../sub-subjects/sub-subjects.service';
import { CreateQuestionDto } from './dto/create-question.dto';
import { UpdateQuestionDto } from './dto/update-question.dto';
import { Question } from './entities/question.entity';

interface CsvRow {
  Question: string;
  Type: string; // Corresponds to QuestionType enum string
  Difficulty: string; // Corresponds to DifficultyLevel enum string
  SubSubject: string; // UUID of SubSubject
  Option1?: string;
  Option2?: string;
  Option3?: string;
  Option4?: string;
  CorrectAnswer?: string;
  // Add more options (option5, isCorrect5, etc.) if your CSV supports more than 4 per MCQ
}
interface QuestionWithTempOptions extends Question {
  _tempOptions?: Option[]; // Add the temporary options property
}

function isNullOrEmpty(str: string | null | undefined): boolean {
  return str === null || str === undefined || str.trim() === '';
}

@Injectable()
export class QuestionsService {
  private readonly logger = new Logger(QuestionsService.name);
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
          const texts = options.map((opt) =>
            opt.optionText?.trim().toLowerCase(),
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
          if (!validationErrors || Object.keys(validationErrors).length == 0) {
            baseQuestion.options =
              options &&
              options.map((opt) =>
                this.optionsRepository.create({
                  optionText: opt.optionText,
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
      query.andWhere('question.questionText ILIKE :search', {
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
      query.andWhere('question.questionText ILIKE :search', {
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
      .andWhere('question.createdById = :userId', { userId: user.sub })
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
              opt.optionText?.trim().toLowerCase(),
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

  async bulkUploadQuestions(csvBuffer: Buffer) {
    const user = this.request.user;
    const questionsToProcess: Question[] = [];
    const errors: { row: number; data: CsvRow; message: string }[] = [];
    const rows: CsvRow[] = [];

    // 1. Collect all rows synchronously
    await new Promise<void>((resolve, reject) => {
      Readable.from(csvBuffer.toString())
        .pipe(csv())
        .on('data', (row: CsvRow) => {
          rows.push(row);
        })
        .on('end', resolve)
        .on('error', reject);
    });

    // 2. Process rows asynchronously
    let rowNum = 1;
    for (const row of rows) {
      rowNum++;
      try {
        // Trim whitespace from all string values in the row
        for (const key in row) {
          if (typeof row[key] === 'string') {
            row[key] = row[key].trim();
          }
        }

        // Basic validation for essential fields
        if (
          isNullOrEmpty(row.Question) ||
          isNullOrEmpty(row.Type) ||
          isNullOrEmpty(row.Difficulty) ||
          isNullOrEmpty(row.SubSubject)
        ) {
          errors.push({
            row: rowNum,
            data: row,
            message:
              'Missing essential fields (Question, Type, Difficulty, SubSubject).',
          });
        }

        // Validate Enums using strict comparison
        const questionType = row.Type as QuestionType;
        const difficultyLevel = Number.parseInt(
          row.Difficulty,
        ) as DifficultyLevel;

        if (!Object.values(QuestionType).includes(questionType)) {
          errors.push({
            row: rowNum,
            data: row,
            message: `Invalid Question Type: '${row.Type}'. Must be one of: ${Object.values(QuestionType).join(', ')}`,
          });
        }

        if (!Object.values(DifficultyLevel).includes(difficultyLevel)) {
          errors.push({
            row: rowNum,
            data: row,
            message: `Invalid Difficulty Level: '${row.Difficulty}'. Must be one of: 1, 2, 3, 4, 5`,
          });
        }

        // Check for duplicate question (case-insensitive, trimmed)
        const exists = await this.questionsRepository
          .createQueryBuilder('question')
          .where(
            'LOWER(TRIM(question.questionText)) = LOWER(TRIM(:Question))',
            { Question: row.Question },
          )
          .getExists();

        if (exists) {
          errors.push({
            row: rowNum,
            data: row,
            message: `Question '${row.Question}' already exists.`,
          });
        }

        // Check subSubject existence
        const subSubject = (
          await this.subSubjectService.getByName(row.SubSubject)
        ).data;
        if (!subSubject) {
          errors.push({
            row: rowNum,
            data: row,
            message: `Sub-Subject '${row.SubSubject}' not found.`,
          });
        }

        // Create question entity
        const question: QuestionWithTempOptions =
          this.questionsRepository.create({
            questionText: row.Question,
            type: questionType,
            difficulty: difficultyLevel,
            subjectId: subSubject?.subjectId,
            subSubjectId: subSubject?.id,
            createdById: user?.sub,
            status: QuestionStatus.PENDING,
            createdAt: new Date(),
            updatedAt: new Date(),
          });

        const tempOptions: Option[] = [];

        // Handle different question types and their correct answers/options
        switch (question.type) {
          case QuestionType.MCQ: {
            if (
              isNullOrEmpty(row.Option1) ||
              isNullOrEmpty(row.Option2) ||
              isNullOrEmpty(row.Option3) ||
              isNullOrEmpty(row.Option4) ||
              isNullOrEmpty(row.CorrectAnswer)
            ) {
              errors.push({
                row: rowNum,
                data: row,
                message: 'MCQ question requires options and a correct answer.',
              });
              break;
            }

            let hasCorrectOption = false;
            for (let i = 1; i <= 4; i++) {
              const optionText = row[`Option${i}` as keyof CsvRow];
              const correctAnswer = row.CorrectAnswer;

              if (optionText) {
                const isCorrect = optionText === correctAnswer;
                if (isCorrect) hasCorrectOption = true;

                tempOptions.push(
                  this.optionsRepository.create({
                    optionText: optionText,
                    isCorrect: isCorrect,
                  }),
                );
              }
            }
            if (!hasCorrectOption) {
              errors.push({
                row: rowNum,
                data: row,
                message:
                  'At least one option must match the correctAnswer for MCQ.',
              });
            }
            question._tempOptions = tempOptions;
            break;
          }

          case QuestionType.TRUE_OR_FALSE: {
            const boolValue = row.CorrectAnswer.toUpperCase();
            if (boolValue !== 'TRUE' && boolValue !== 'FALSE') {
              errors.push({
                row: rowNum,
                data: row,
                message:
                  'Correct answer for TRUE_OR_FALSE must be "True" or "False".',
              });
            }
            question.correctAnswerBoolean = boolValue === 'TRUE';
            break;
          }

          case QuestionType.FILL_IN_THE_BLANKS: {
            if (isNullOrEmpty(row.CorrectAnswer)) {
              errors.push({
                row: rowNum,
                data: row,
                message:
                  'Correct answer is required for FILL_IN_THE_BLANKS type.',
              });
            }
            question.correctAnswerText = row.CorrectAnswer;
            break;
          }

          case QuestionType.SHORT:
          case QuestionType.LONG:
          default:
            errors.push({
              row: rowNum,
              data: row,
              message: `Unsupported question type: '${row.Type}'. Must be one of: ${Object.values(QuestionType).join(', ')}`,
            });
        }

        questionsToProcess.push(question);
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Unknown error';
        errors.push({
          row: rowNum,
          data: row,
          message: `Error processing row ${rowNum}: ${errorMessage}`,
        });
      }
    }

    // Log and return errors if any
    if (errors.length > 0) {
      this.logger.error(
        `CSV processing completed with ${errors.length} errors.`,
        JSON.stringify(errors, null, 2),
      );
      return {
        success: false,
        message: 'CSV processing completed with errors',
        data: { errors },
      };
    }

    // If no errors, proceed with bulk insert
    try {
      for (const question of questionsToProcess) {
        const savedQuestion = await this.questionsRepository.save(question);
        const questionWithTempOptions = question as QuestionWithTempOptions;

        if (
          questionWithTempOptions._tempOptions &&
          questionWithTempOptions._tempOptions.length > 0
        ) {
          for (const option of questionWithTempOptions._tempOptions) {
            option.questionId = savedQuestion.id;
          }
          await this.optionsRepository.save(
            questionWithTempOptions._tempOptions,
          );
        }
      }
      return {
        success: true,
        message: 'Questions uploaded successfully',
        data: {
          totalQuestions: questionsToProcess.length,
        },
      };
    } catch (err) {
      this.logger.error('Error saving questions:', err);
      throw new BadRequestException(
        'Error saving questions. Please try again.',
      );
    }
  }
}

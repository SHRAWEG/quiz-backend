import {
  forwardRef,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { QuestionsService } from '../questions/questions.service';
import { CreateSubSubjectDto } from './dto/create-sub-subject.dto';
import { UpdateSubSubjectDto } from './dto/update-sub-subject.dto';
import { SubSubject } from './entities/sub-subject.entity';

@Injectable()
export class SubSubjectsService {
  constructor(
    @InjectRepository(SubSubject)
    private readonly subSubjectRepository: Repository<SubSubject>,
    @Inject(forwardRef(() => QuestionsService)) // <-- wrap QuestionsService injection
    private readonly questionsService: QuestionsService,
  ) {}

  async create(createSubSubjectDto: CreateSubSubjectDto) {
    const queryBuilder = this.subSubjectRepository
      .createQueryBuilder('subSubject')
      .insert()
      .values(createSubSubjectDto);

    const result = await queryBuilder.execute();

    return {
      success: true,
      message: 'Sub-Subject created successfully',
      data: result,
    };
  }

  async get(page: number, limit: number, search: string, subjectId?: string) {
    const skip = (page - 1) * limit;
    const queryBuilder = this.subSubjectRepository
      .createQueryBuilder('subSubject')
      .leftJoinAndSelect('subSubject.subject', 'subject');

    if (search) {
      queryBuilder.andWhere('subSubject.name ILIKE :search', {
        search: `%${search}%`,
      });
    }

    if (subjectId) {
      queryBuilder.andWhere('subSubject.subject_id = :subjectId', {
        subjectId,
      });
    }

    const [subSubjects, totalItems] = await queryBuilder
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    const totalPages = Math.ceil(totalItems / limit);

    return {
      success: true,
      message: 'Sub-subjects retrieved successfully',
      data: subSubjects,
      totalItems,
      totalPages,
      currentPage: page,
      pageSize: limit,
    };
  }

  async search(search: string, subjectId?: string) {
    const queryBuilder = this.subSubjectRepository
      .createQueryBuilder('subSubject')
      .leftJoinAndSelect('subSubject.subject', 'subject');

    if (search) {
      queryBuilder.andWhere('subSubject.name ILIKE :search', {
        search: `%${search}%`,
      });
    }

    if (subjectId) {
      queryBuilder.andWhere('subSubject.subject_id = :subjectId', {
        subjectId,
      });
    }

    const subSubjects = await queryBuilder.getMany();

    return {
      success: true,
      message: 'Search results retrieved successfully',
      data: subSubjects,
    };
  }

  async getById(id: string) {
    const queryBuilder = this.subSubjectRepository
      .createQueryBuilder('subSubject')
      .leftJoinAndSelect('subSubject.subject', 'subject')
      .where('subSubject.id = :id', { id });

    const subSubject = await queryBuilder.getOne();

    if (!subSubject) {
      throw new HttpException('Sub-Subject not found', HttpStatus.NOT_FOUND);
    }

    return {
      success: true,
      message: 'Sub-Subject retrieved successfully',
      data: subSubject,
    };
  }

  async update(id: string, updateSubSubjectDto: UpdateSubSubjectDto) {
    const queryBuilder = this.subSubjectRepository
      .createQueryBuilder()
      .update(SubSubject)
      .set(updateSubSubjectDto)
      .where('id = :id', { id });

    const result = await queryBuilder.execute();

    if (result.affected === 0) {
      throw new HttpException('Sub-Subject not found', HttpStatus.NOT_FOUND);
    }

    return {
      success: true,
      message: 'Sub-Subject updated successfully',
      data: { id, ...updateSubSubjectDto },
    };
  }

  async delete(id: string) {
    const subSubject = await this.subSubjectRepository
      .createQueryBuilder('subSubject')
      .leftJoinAndSelect('subSubject.questions', 'questions')
      .where('subSubject.id = :id', { id })
      .getOne();

    if (subSubject && subSubject.questions.length > 0) {
      throw new HttpException(
        'Sub Subject cannot be deleted because it has associated questions',
        HttpStatus.BAD_REQUEST, // This is equivalent to HTTP status code 400
      );
    }

    const result = await this.subSubjectRepository
      .createQueryBuilder()
      .delete()
      .where('id = :id', { id })
      .execute();

    return {
      success: true,
      message: 'Sub-Subject deleted successfully',
      data: result,
    };
  }
}

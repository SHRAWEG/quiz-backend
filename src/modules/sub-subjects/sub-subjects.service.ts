import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Question } from '../questions/entities/question.entity';
import { CreateSubSubjectDto } from './dto/create-sub-subject.dto';
import { UpdateSubSubjectDto } from './dto/update-sub-subject.dto';
import { SubSubject } from './entities/sub-subject.entity';

@Injectable()
export class SubSubjectsService {
  constructor(
    @InjectRepository(SubSubject)
    private readonly subSubjectRepository: Repository<SubSubject>,
    @InjectRepository(Question)
    private readonly questionRepository: Repository<Question>,
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
    // 1. Check if any question uses this subject
    const isUsedInQuestion = await this.questionRepository
      .createQueryBuilder('subSubject')
      .where('subSubject.id = :id', { id }) // Or 'q.subject.id = :id' if using relation
      .getExists(); // Efficient existence check
    if (isUsedInQuestion) {
      throw new BadRequestException(
        'Cannot delete Sub-subject; it is used in some questions',
      );
    }

    const result = await this.subSubjectRepository
      .createQueryBuilder()
      .delete()
      .where('id = :id', { id })
      .execute();

    if (result.affected === 0) {
      throw new NotFoundException('Sub-subject not found');
    }

    return {
      success: true,
      message: 'Sub-Subject deleted successfully',
      data: result,
    };
  }
}

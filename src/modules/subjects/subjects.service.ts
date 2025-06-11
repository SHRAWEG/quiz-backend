import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Question } from '../questions/entities/question.entity';
import { SubSubject } from '../sub-subjects/entities/sub-subject.entity';
import { CreateSubjectDto } from './dto/create-subject.dto';
import { UpdateSubjectDto } from './dto/update-subject.dto';
import { Subject } from './entities/subject.entity';

@Injectable()
export class SubjectsService {
  constructor(
    @InjectRepository(Subject)
    private readonly subjectRepository: Repository<Subject>,
    @InjectRepository(Question)
    private readonly questionRepository: Repository<Question>,
    @InjectRepository(SubSubject)
    private readonly subSubjectRepository: Repository<SubSubject>,
  ) {}
  // CREATE
  async create(createSubjectDto: CreateSubjectDto) {
    const queryBuilder = this.subjectRepository
      .createQueryBuilder()
      .insert()
      .into(Subject)
      .values(createSubjectDto);

    const result = await queryBuilder.execute();

    return {
      success: true,
      message: 'Subject created successfully',
      data: result,
    };
  }

  // READ
  async get(page: number, limit: number, search: string) {
    const skip = (page - 1) * limit;
    const queryBuilder = this.subjectRepository
      .createQueryBuilder('subject')
      .orderBy('subject.id', 'DESC')
      .skip(skip)
      .take(limit);

    if (search) {
      queryBuilder.andWhere('subject.name ILIKE :search', {
        search: `%${search}%`,
      });
    }

    const [subjects, totalItems] = await queryBuilder.getManyAndCount();
    const totalPages = Math.ceil(totalItems / limit);

    return {
      success: true,
      message: 'Subjects retrieved successfully',
      data: subjects,
      totalItems,
      totalPages,
      currentPage: page,
      pageSize: limit,
    };
  }

  async search(search?: string) {
    const queryBuilder = this.subjectRepository.createQueryBuilder('subject');

    if (search) {
      queryBuilder.andWhere('subject.name ILIKE :search', {
        search: `%${search}%`,
      });
    }

    const subjects = await queryBuilder.getMany();

    return {
      success: true,
      message: 'Search results retrieved successfully',
      data: subjects,
    };
  }

  async findById(id: string) {
    const queryBuilder = this.subjectRepository
      .createQueryBuilder('subject')
      .leftJoinAndSelect('subject.subSubjects', 'subSubjects')
      .where('subject.id = :id', { id });

    const subject = await queryBuilder.getOne();

    if (!subject) {
      throw new Error('Subject not found');
    }

    return {
      success: true,
      message: 'Subject retrieved successfully',
      data: subject,
    };
  }

  // UPDATE
  async update(id: string, updateSubjectDto: UpdateSubjectDto) {
    const queryBuilder = this.subjectRepository
      .createQueryBuilder()
      .update(Subject)
      .set(updateSubjectDto)
      .where('id = :id', { id });

    const result = await queryBuilder.execute();

    if (result.affected === 0) {
      throw new Error('Subject not found');
    }

    const updatedSubject = await this.subjectRepository.findOneBy({ id });

    return {
      success: true,
      message: 'Subject updated successfully',
      data: updatedSubject,
    };
  }

  // DELETE
  async delete(id: string) {
    // 1. Check if any question uses this subject
    const isUsedInQuestion = await this.questionRepository
      .createQueryBuilder('q')
      .where('q.subjectId = :id', { id }) // Or 'q.subject.id = :id' if using relation
      .getExists(); // Efficient existence check

    const isUsedInSubject = await this.subSubjectRepository
      .createQueryBuilder('q')
      .where('q.subjectId = :id', { id }) // Or 'q.subject.id = :id' if using relation
      .getExists(); // Efficient existence check
    if (isUsedInQuestion || isUsedInSubject) {
      throw new BadRequestException(
        'Subject cannot be deleted because it has associated sub-subjects or questions or both',
      );
    }

    // 2. Proceed with deletion
    const result = await this.subjectRepository
      .createQueryBuilder()
      .delete()
      .where('id = :id', { id })
      .execute();

    if (result.affected === 0) {
      throw new NotFoundException('Subject not found');
    }

    return {
      success: true,
      message: 'Subject deleted successfully',
      data: result,
    };
  }
}

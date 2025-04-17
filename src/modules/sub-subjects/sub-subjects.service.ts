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
    const newSubSubject = this.subSubjectRepository.create(createSubSubjectDto);
    const savedsubSubject = await this.subSubjectRepository.save(newSubSubject);
    return {
      success: true,
      message: 'Sub-Subject created successfully',
      data: savedsubSubject,
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
      data: subSubjects,
    };
  }

  async getById(id: string) {
    const subsubject = await this.subSubjectRepository.findOne({
      where: { id },
      relations: {
        subject: true,
      },
    });
    return {
      data: subsubject,
    };
  }

  async update(id: string, updateSubSubjectDto: UpdateSubSubjectDto) {
    await this.subSubjectRepository.update(id, updateSubSubjectDto);
    return {
      success: true,
      message: 'Sub Subject updated successfully',
      data: {
        id: id,
        ...updateSubSubjectDto,
      },
    };
  }

  async delete(id: string) {
    const subSubject = await this.subSubjectRepository.findOne({
      where: { id },
      relations: ['questions'],
    });

    if (subSubject && subSubject.questions.length > 0) {
      throw new HttpException(
        'Sub Subject cannot be deleted because it has associated questions',
        HttpStatus.BAD_REQUEST, // This is equivalent to HTTP status code 400
      );
    }
    const deletedSubSubject = await this.subSubjectRepository.delete(id);
    return {
      success: true,
      message: 'Sub Subject deleted successfully',
      data: deletedSubSubject,
    };
  }
}

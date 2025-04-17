import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, Repository } from 'typeorm';
import { CreateSubjectDto } from './dto/create-subject.dto';
import { UpdateSubjectDto } from './dto/update-subject.dto';
import { Subject } from './entities/subject.entity';

@Injectable()
export class SubjectsService {
  constructor(
    @InjectRepository(Subject)
    private readonly subjectRepository: Repository<Subject>,
  ) {}

  // CREATE
  async create(createSubjectDto: CreateSubjectDto) {
    const newSubject = this.subjectRepository.create(createSubjectDto);
    const savedSubject = await this.subjectRepository.save(newSubject);
    return {
      success: true,
      message: 'Subject created successfully',
      data: savedSubject,
    };
  }

  // READ
  async get(page: number, limit: number, search: string) {
    const skip = (page - 1) * limit;
    const findOptions: {
      skip: number;
      take: number;
      where?: { name: any };
    } = {
      skip,
      take: limit,
    };
    if (search) {
      findOptions.where = {
        name: ILike(`%${search}%`),
      };
    }
    const [subjects, totalItems] =
      await this.subjectRepository.findAndCount(findOptions);
    const totalPages = Math.ceil(totalItems / limit);
    return {
      subjects,
      totalItems,
      totalPages,
      currentPage: page,
      pageSize: limit,
    };
  }

  async search(search?: string) {
    const findOptions: {
      where?: { name: any };
    } = {};

    if (search) {
      findOptions.where = {
        name: ILike(`%${search}%`),
      };
    }

    const subjects = await this.subjectRepository.find(findOptions);

    return {
      data: subjects,
    };
  }

  async findById(id: string) {
    const subject = await this.subjectRepository.findOneBy({ id: id });
    return {
      data: subject,
    };
  }

  // UPDATE
  async update(id: string, updateSubjectDto: UpdateSubjectDto) {
    await this.subjectRepository.update(id, updateSubjectDto);
    const updatedSubject = await this.subjectRepository.findOneBy({ id });

    return {
      success: true,
      message: 'Subject updated successfully',
      data: updatedSubject,
    };
  }

  // DELETE
  async delete(id: string) {
    const deletedSubject = await this.subjectRepository.delete(id);
    return {
      success: true,
      message: 'Subject deleted successfully',
      data: deletedSubject,
    };
  }
}

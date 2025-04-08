import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateSubjectDto } from './dto/create-subject.dto';
import { UpdateSubjectDto } from './dto/update-subject.dto';
import { Subject } from './entities/subject.entity';

@Injectable()
export class SubjectsService {
  constructor(
    @InjectRepository(Subject)
    private readonly subjectRepository: Repository<Subject>,
  ) {}

  async create(createSubjectDto: CreateSubjectDto) {
    const newSubject = this.subjectRepository.create(createSubjectDto);
    const savedSubject = await this.subjectRepository.save(newSubject);
    return {
      success: true,
      message: 'Subject created successfully',
      data: savedSubject,
    };
  }

  async getAll() {
    const subjects = await this.subjectRepository.find();
    return {
      data: subjects,
    };
  }

  async findOne(id: string) {
    const subject = await this.subjectRepository.findOneBy({ id: id });
    return {
      data: subject,
    };
  }

  async update(id: string, updateSubjectDto: UpdateSubjectDto) {
    await this.subjectRepository.update(id, updateSubjectDto);
    const updatedSubject = await this.subjectRepository.findOneBy({ id });

    return {
      success: true,
      message: 'Subject updated successfully',
      data: updatedSubject,
    };
  }

  async delete(id: string) {
    const deletedSubject = await this.subjectRepository.delete(id);
    return {
      success: true,
      message: 'Subject deleted successfully',
      data: deletedSubject,
    };
  }
}

import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  ValidationError,
  ValidationException,
} from 'src/common/exceptions/validation.exception';
import { Repository } from 'typeorm';
import { Question } from '../questions/entities/question.entity';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { Category } from './entities/category.entity';

@Injectable()
export class CategoriesService {
  constructor(
    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,
    @InjectRepository(Question)
    private readonly questionRepository: Repository<Question>,
  ) {}

  // CREATE
  async create(createCategoryDto: CreateCategoryDto) {
    const validationErrors: ValidationError = {};

    if (validationErrors && Object.keys(validationErrors).length > 0) {
      throw new ValidationException(validationErrors);
    }
    const queryBuilder = this.categoryRepository
      .createQueryBuilder()
      .insert()
      .into(Category)
      .values(createCategoryDto);

    const result = await queryBuilder.execute();

    return {
      success: true,
      message: 'Category created successfully',
      data: result,
    };
  }

  // READ
  async get(page: number, limit: number, search: string) {
    const skip = (page - 1) * limit;
    const queryBuilder = this.categoryRepository
      .createQueryBuilder('category')
      .skip(skip)
      .take(limit);

    if (search) {
      queryBuilder.andWhere('category.name ILIKE :search', {
        search: `%${search}%`,
      });
    }

    const [categories, totalItems] = await queryBuilder.getManyAndCount();
    const totalPages = Math.ceil(totalItems / limit);

    return {
      success: true,
      message: 'Categories retrieved successfully',
      data: categories,
      totalItems,
      totalPages,
      currentPage: page,
      pageSize: limit,
    };
  }

  async search(search?: string) {
    const queryBuilder = this.categoryRepository.createQueryBuilder('category');

    if (search) {
      queryBuilder.andWhere('category.name ILIKE :search', {
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
    const queryBuilder = this.categoryRepository
      .createQueryBuilder('category')
      .where('category.id = :id', { id });

    const category = await queryBuilder.getOne();

    if (!category) {
      throw new Error('Category not found');
    }

    return {
      success: true,
      message: 'Category retrieved successfully',
      data: category,
    };
  }

  // UPDATE
  async update(id: string, updateCategoryDto: UpdateCategoryDto) {
    const queryBuilder = this.categoryRepository
      .createQueryBuilder()
      .update(Category)
      .set(updateCategoryDto)
      .where('id = :id', { id });

    const result = await queryBuilder.execute();

    if (result.affected === 0) {
      throw new NotFoundException('Category not found');
    }

    const updatedCategory = await this.categoryRepository.findOneBy({ id });

    return {
      success: true,
      message: 'Category updated successfully',
      data: updatedCategory,
    };
  }

  // DELETE
  async delete(id: string) {
    // 1. Check if any question uses this subject
    const isUsedInQuestion = await this.questionRepository
      .createQueryBuilder('category')
      .where('category.id = :id', { id }) // Or 'q.subject.id = :id' if using relation
      .getExists(); // Efficient existence check
    if (isUsedInQuestion) {
      throw new BadRequestException(
        'Cannot delete Category; it is used in some questions.',
      );
    }

    const result = await this.categoryRepository
      .createQueryBuilder()
      .delete()
      .where('id = :id', { id })
      .execute();

    if (result.affected === 0) {
      throw new NotFoundException('Category not found');
    }

    return {
      success: true,
      message: 'Sub-Subject deleted successfully',
      data: result,
    };
  }
}

import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { InjectRepository } from '@nestjs/typeorm';
import { Request } from 'express';
import { Repository } from 'typeorm';
import { CreateFeedbackDto } from './dto/create-feedback.dto';
import { Feedback } from './entities/feedback.entity';

@Injectable()
export class FeedbacksService {
  constructor(
    @InjectRepository(Feedback)
    private readonly feedbackRepository: Repository<Feedback>,
    @Inject(REQUEST) private readonly request: Request,
  ) {}

  async create(dto: CreateFeedbackDto) {
    const user = this.request.user;
    const { feedback } = dto;
    const newfeedback = await this.feedbackRepository
      .createQueryBuilder()
      .insert()
      .into(Feedback)
      .values({ feedback: feedback, fromId: user?.sub })
      .returning('*')
      .execute();

    return {
      success: true,
      data: {
        newfeedback,
      },
    };
  }

  async get(page: number, limit: number) {
    const skip = (page - 1) * limit;

    const queryBuilder = this.feedbackRepository
      .createQueryBuilder('feedback')
      .leftJoinAndSelect('feedback.from', 'user')
      .orderBy('feedback.createdAt', 'DESC')
      .skip(skip)
      .take(limit);

    const [data, totalItems] = await queryBuilder.getManyAndCount();

    return {
      success: true,
      message: 'Feedbacks retrieved successfully',
      data,
      totalItems,
      totalPages: Math.ceil(totalItems / limit),
      currentPage: page,
      pageSize: limit,
    };
  }

  async findOne(id: number) {
    const feedback = await this.feedbackRepository
      .createQueryBuilder('feedback')
      .leftJoinAndSelect('feedback.from', 'user')
      .where('feedback.id = :id', { id })
      .getOne();

    if (!feedback) {
      throw new NotFoundException('Feedback not found');
    }
    return {
      success: true,
      message: 'Feedbacks retrieved successfully',
      data: feedback,
    };
  }
}

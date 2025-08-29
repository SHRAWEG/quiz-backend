import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { InjectRepository } from '@nestjs/typeorm';
import { Request } from 'express';
import { LessThanOrEqual, MoreThanOrEqual, Repository } from 'typeorm';
import { CreateNoticeDto } from './dto/create-notice.dto';
import { UpdateNoticeDto } from './dto/update-notice.dto';
import { Notice } from './entities/notice.entity';

@Injectable()
export class NoticesService {
  constructor(
    @InjectRepository(Notice)
    private readonly noticeRepository: Repository<Notice>,
    @Inject(REQUEST) private readonly request: Request,
  ) {}

  async create(createNoticeDto: CreateNoticeDto) {
    const notice = this.noticeRepository.create({
      ...createNoticeDto,
      createdById: this.request.user.sub,
    });

    const savedNotice = await this.noticeRepository.save(notice);
    return {
      success: true,
      message: 'Notice created successfully',
      data: savedNotice,
    };
  }

  async findAll() {
    const notices = await this.noticeRepository.find({
      relations: ['createdBy'],
      order: { createdAt: 'DESC' },
    });

    return {
      success: true,
      data: notices,
    };
  }

  async findOne(id: string) {
    const notice = await this.noticeRepository.findOne({
      where: { id },
      relations: ['createdBy'],
    });

    if (!notice) {
      throw new NotFoundException('Notice not found');
    }

    return {
      success: true,
      data: notice,
    };
  }

  async update(id: string, updateNoticeDto: UpdateNoticeDto) {
    const notice = await this.noticeRepository.findOne({ where: { id } });

    if (!notice) {
      throw new NotFoundException('Notice not found');
    }

    // Validate date range if dates are being updated
    if (updateNoticeDto.fromDate && updateNoticeDto.toDate) {
      if (updateNoticeDto.fromDate > updateNoticeDto.toDate) {
        throw new Error('From date cannot be after to date');
      }
    }

    await this.noticeRepository.update(id, updateNoticeDto);
    const updatedNotice = await this.noticeRepository.findOne({
      where: { id },
      relations: ['createdBy'],
    });

    return {
      success: true,
      message: 'Notice updated successfully',
      data: updatedNotice,
    };
  }

  async remove(id: string) {
    const notice = await this.noticeRepository.findOne({ where: { id } });

    if (!notice) {
      throw new NotFoundException('Notice not found');
    }

    await this.noticeRepository.remove(notice);

    return {
      success: true,
      message: 'Notice deleted successfully',
    };
  }

  async getActiveNotices() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const activeNotices = await this.noticeRepository.find({
      where: {
        isActive: true,
        fromDate: LessThanOrEqual(today),
        toDate: MoreThanOrEqual(today),
      },
      relations: ['createdBy'],
      order: { createdAt: 'DESC' },
    });

    return {
      success: true,
      data: activeNotices,
    };
  }

  async getNoticesForDateRange(fromDate: Date, toDate: Date) {
    const notices = await this.noticeRepository.find({
      where: {
        isActive: true,
        fromDate: LessThanOrEqual(toDate),
        toDate: MoreThanOrEqual(fromDate),
      },
      relations: ['createdBy'],
      order: { createdAt: 'DESC' },
    });

    return {
      success: true,
      data: notices,
    };
  }
}

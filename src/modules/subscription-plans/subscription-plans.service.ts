import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { SubscriptionPlanDuration } from 'src/common/enums/subscription-plans.enum';
import { Brackets, DataSource, Repository } from 'typeorm';
import { CreateSubscriptionPlanDto } from './dto/create-subscription-plan.dto';
import { UpdateSubscriptionPlanDto } from './dto/update-subscription-plan.dto';
import { SubscriptionPlan } from './entities/subscription-plan.entity';

@Injectable()
export class SubscriptionPlansService {
  constructor(
    @InjectRepository(SubscriptionPlan)
    private readonly subscriptionPlanRepository: Repository<SubscriptionPlan>,
    private readonly dataSource: DataSource,
  ) {}

  async create(createDto: CreateSubscriptionPlanDto) {
    const existing = await this.subscriptionPlanRepository
      .createQueryBuilder('subscriptionPlan')
      .where('LOWER(subscriptionPlan.name) = LOWER(:name)', {
        name: createDto.name,
      })
      .getOne();

    if (existing) {
      throw new BadRequestException(
        'Subscription plan with this name already exists',
      );
    }

    const insertResult = await this.subscriptionPlanRepository
      .createQueryBuilder()
      .insert()
      .into(SubscriptionPlan)
      .values(createDto)
      .returning('*')
      .execute();

    return {
      success: true,
      message: 'Question created successfully',
      data: insertResult,
    };
  }

  async get(
    page: number,
    limit: number,
    search?: string,
    status?: string,
    duration?: SubscriptionPlanDuration,
  ) {
    const queryBuilder =
      this.subscriptionPlanRepository.createQueryBuilder('subscriptionPlans');

    if (search) {
      queryBuilder.andWhere(
        new Brackets((qb) => {
          qb.where('LOWER(subscriptionPlans.name) LIKE LOWER(:search)', {
            search: `%${search}%`,
          }).orWhere(
            'LOWER(subscriptionPlans.description) LIKE LOWER(:search)',
            { search: `%${search}%` },
          );
        }),
      );
    }
    if (status !== undefined && (status === 'true' || status === 'false')) {
      const isActive = status === 'true';
      queryBuilder.andWhere('subscriptionPlans.isActive = :isActive', {
        isActive,
      });
    }
    if (duration) {
      queryBuilder.andWhere('subscriptionPlans.duration = :duration', {
        duration,
      });
    }
    queryBuilder.orderBy('subscriptionPlans.duration', 'ASC');
    const skip = (page - 1) * limit;
    queryBuilder.skip(skip).take(limit);
    const [data, totalItems] = await queryBuilder.getManyAndCount();

    return {
      success: true,
      message: 'Subscription Plans fetched successfully',
      data: data,
      totalItems,
      totalPages: Math.ceil(totalItems / limit),
      currentPage: page,
      pageSize: limit,
    };
  }

  async getActiveSubscriptionPlans() {
    const activeSubscriptionplans = await this.subscriptionPlanRepository
      .createQueryBuilder('subscriptionPlan')
      .where('subscriptionPlan.isActive = :status', { status: true })
      .orderBy('subscriptionPlan.duration', 'ASC')
      .getMany();

    return {
      success: true,
      message: 'Active Subscription Plans fetched successfully',
      data: activeSubscriptionplans,
    };
  }

  async getById(id: string) {
    const subscriptionPlan = await this.subscriptionPlanRepository
      .createQueryBuilder('subscriptionPlan')
      .where('subscriptionPlan.id = :id', { id })
      .getOne();

    if (!subscriptionPlan) {
      throw new NotFoundException(
        'Subscription plan not found: Id does not exist',
      );
    }

    return {
      success: true,
      message: 'Subscription Plan fetched successfully',
      data: subscriptionPlan,
    };
  }

  async update(id: string, updateDto: UpdateSubscriptionPlanDto) {
    const subscriptionPlan = await this.subscriptionPlanRepository
      .createQueryBuilder('subscriptionPlan')
      .where('subscriptionPlan.id = :id', { id })
      .getOne();

    if (!subscriptionPlan) {
      throw new NotFoundException(
        'Subscription plan not found: Id does not exist',
      );
    }

    await this.subscriptionPlanRepository
      .createQueryBuilder()
      .update(SubscriptionPlan)
      .set(updateDto)
      .where('id = :id', { id })
      .execute();

    const updatedSubscriptionPlan = await this.subscriptionPlanRepository
      .createQueryBuilder('subscriptionPlan')
      .where('subscriptionPlan.id = :id', { id })
      .getOne();

    return {
      success: true,
      message: 'Subscription Plan updated successfully',
      data: updatedSubscriptionPlan,
    };
  }

  async markInacive(id: string) {
    const result = await this.subscriptionPlanRepository
      .createQueryBuilder()
      .update(SubscriptionPlan)
      .set({ isActive: false })
      .where('id = :id', { id })
      .execute();

    if (result.affected === 0) {
      throw new NotFoundException(
        'Subscription plan not found: Id doesnot exist',
      );
    }

    return {
      success: true,
      message: 'Subscription plan deleted successfully',
      data: { aggected: result.affected },
    };
  }
}

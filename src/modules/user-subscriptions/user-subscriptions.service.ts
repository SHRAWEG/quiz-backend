import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { InjectRepository } from '@nestjs/typeorm';
import * as crypto from 'crypto-js';
import { Request } from 'express';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { SubscriptionPlansService } from '../subscription-plans/subscription-plans.service';
import {
  PaymentMethod,
  SubscriptionPaymentStatus,
  UserSubscription,
} from './entities/user-subscription.entity';

@Injectable()
export class UserSubscriptionsService {
  constructor(
    @InjectRepository(UserSubscription)
    private readonly userSubscriptionRepository: Repository<UserSubscription>,
    private readonly subscriptionPlanService: SubscriptionPlansService,
    @Inject(REQUEST) private readonly request: Request,
  ) {}

  async checkout(subscriptionPlanId: string) {
    const user = this.request.user; // Assuming you have a user in the request object

    const subscriptionPlan =
      await this.subscriptionPlanService.getById(subscriptionPlanId);

    if (subscriptionPlan.data === null) {
      throw new Error('Subscription plan not found');
    }

    const product_code = 'EPAYTEST';
    const total_amount = subscriptionPlan.data.price;
    const transaction_uuid = uuidv4();
    const message = `total_amount=${total_amount},transaction_uuid=${transaction_uuid},product_code=${product_code}`;
    const secretKey = process.env.ESEWA_SECRET_KEY;
    const hash = crypto.HmacSHA256(message, secretKey);
    const signature = crypto.enc.Base64.stringify(hash);

    const userSubscriptionDto = {
      userId: user.sub, // Assuming the user object has an id field
      subscriptionPlanId: subscriptionPlan.data.id, // Assuming the subscription plan has an id field
      paymentStatus: SubscriptionPaymentStatus.PENDING,
      paymentMethod: PaymentMethod.ESEWA,
      total_amount,
      product_code,
      transaction_uuid,
      signature,
      isActive: false,
    };

    //Check if the user already has an active subscription
    const existingSubscription = await this.userSubscriptionRepository
      .createQueryBuilder('userSubscription')
      .where('userSubscription.isActive = :isActive', { isActive: true })
      .andWhere('userSubscription.userId = :userId', { userId: user.sub }) // Assuming you have a userId field
      .getOne();

    if (existingSubscription) {
      throw new BadRequestException(
        'User is already subscribed to an active plan',
      );
    }

    const insertResult = await this.userSubscriptionRepository
      .createQueryBuilder()
      .insert()
      .into(UserSubscription)
      .values(userSubscriptionDto)
      .returning('*')
      .execute();

    return {
      success: true,
      message: 'User subscription created successfully',
      data: insertResult.generatedMaps[0],
    };
  }
}

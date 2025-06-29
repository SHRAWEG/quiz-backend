import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
} from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { InjectRepository } from '@nestjs/typeorm';
import * as crypto from 'crypto-js';
import { Request } from 'express';
import { SubscriptionPlanDuration } from 'src/common/enums/subscription-plans.enum';
import { In, MoreThan, Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { SubscriptionPlansService } from '../subscription-plans/subscription-plans.service';
import {
  PaymentMethod,
  SubscriptionPaymentStatus,
  UserSubscription,
} from './entities/user-subscription.entity';

interface DecodedPaymentData {
  transaction_uuid: string;
  status: 'COMPLETE' | 'CANCELED';
  signature: string;
  signed_field_names: string;
}

@Injectable()
export class UserSubscriptionsService {
  private readonly logger = new Logger(UserSubscriptionsService.name);

  constructor(
    @InjectRepository(UserSubscription)
    private readonly userSubscriptionRepository: Repository<UserSubscription>,
    private readonly subscriptionPlanService: SubscriptionPlansService,
    @Inject(REQUEST) private readonly request: Request,
  ) {}

  async checkout(subscriptionPlanId: string) {
    const user = this.request.user as { sub: string };

    // 1. Check for ACTIVE subscriptions (block if exists)
    const activeSubscription = await this.userSubscriptionRepository.findOne({
      where: {
        userId: user.sub,
        isActive: true,
      },
    });

    if (activeSubscription) {
      throw new BadRequestException('You already have an active subscription.');
    }

    // 2. Check for PENDING subscriptions (cancel them)
    const pendingSubscriptions = await this.userSubscriptionRepository.find({
      where: {
        userId: user.sub,
        paymentStatus: SubscriptionPaymentStatus.PENDING,
      },
    });

    if (pendingSubscriptions.length > 0) {
      this.logger.log(
        `Cancelling ${pendingSubscriptions.length} pending subscriptions for user ${user.sub}`,
      );
      await this.userSubscriptionRepository.update(
        { id: In(pendingSubscriptions.map((sub) => sub.id)) },
        { paymentStatus: SubscriptionPaymentStatus.CANCELED },
      );
    }

    // 3. Get subscription plan details
    const subscriptionPlan =
      await this.subscriptionPlanService.getById(subscriptionPlanId);

    if (!subscriptionPlan.data) {
      throw new BadRequestException('Subscription plan not found.');
    }

    // 4. Generate eSewa payment data
    const product_code = 'EPAYTEST';
    const total_amount = subscriptionPlan.data.price;
    const transaction_uuid = uuidv4();

    // 5. Generate signature
    const message = `total_amount=${total_amount},transaction_uuid=${transaction_uuid},product_code=${product_code}`;
    const secretKey = process.env.ESEWA_SECRET_KEY;
    const hash = crypto.HmacSHA256(message, secretKey);
    const signature = crypto.enc.Base64.stringify(hash);

    // 6. Create new subscription
    const newSubscription = await this.userSubscriptionRepository.save({
      userId: user.sub,
      subscriptionPlanId: subscriptionPlan.data.id,
      paymentStatus: SubscriptionPaymentStatus.PENDING,
      paymentMethod: PaymentMethod.ESEWA,
      totalAmount: total_amount,
      productCode: product_code,
      transactionUuid: transaction_uuid,
      signature,
      isActive: false,
    });

    return {
      success: true,
      message: 'Subscription checkout initiated. Complete payment to activate.',
      data: newSubscription,
    };
  }

  async updatePaymentStatus(encodedData: string) {
    // 1. Decode and parse the payment data
    let paymentData: DecodedPaymentData;
    try {
      const decodedData = Buffer.from(encodedData, 'base64').toString('utf-8');
      paymentData = JSON.parse(decodedData) as DecodedPaymentData;
    } catch (error) {
      this.logger.error('Failed to decode payment data', error);
      throw new BadRequestException('Invalid payment data format.');
    }

    // 2. Validate required fields
    if (
      !paymentData.transaction_uuid ||
      !paymentData.status ||
      !paymentData.signature ||
      !paymentData.signed_field_names
    ) {
      throw new BadRequestException('Missing required payment fields.');
    }

    // 3. Find the subscription with plan relation
    const subscription = await this.userSubscriptionRepository.findOne({
      where: { transactionUuid: paymentData.transaction_uuid },
      relations: ['plan'],
    });

    if (!subscription) {
      throw new BadRequestException('Subscription not found.');
    }

    // 4. Verify the signature (security check)
    const signedFields = paymentData.signed_field_names.split(',');
    const message = signedFields
      .map((field) => `${field}=${paymentData[field]}`)
      .join(',');
    const secretKey = process.env.ESEWA_SECRET_KEY;
    const expectedHash = crypto.HmacSHA256(message, secretKey);
    const expectedSignature = crypto.enc.Base64.stringify(expectedHash);

    if (expectedSignature !== paymentData.signature) {
      this.logger.error(
        `Signature mismatch for transaction ${paymentData.transaction_uuid}`,
      );
      throw new BadRequestException('Invalid payment signature.');
    }

    // 5. Update subscription status and dates
    const now = new Date();
    subscription.startedAt = now;

    // Calculate expiration date based on plan duration
    if (paymentData.status === 'COMPLETE') {
      subscription.paymentStatus = SubscriptionPaymentStatus.COMPLETE;
      subscription.isActive = true;

      // Set expiration date based on plan duration
      if (subscription.plan) {
        const duration = subscription.plan.duration;
        const expiresAt = new Date(now);

        switch (duration) {
          case SubscriptionPlanDuration.MONTHLY:
            expiresAt.setMonth(now.getMonth() + 1);
            break;
          case SubscriptionPlanDuration.YEARLY:
            expiresAt.setFullYear(now.getFullYear() + 1);
            break;
          case SubscriptionPlanDuration.QUARTERLY:
            expiresAt.setMonth(now.getMonth() + 3);
            break;
          case SubscriptionPlanDuration.SEMI_ANNUAL:
            expiresAt.setMonth(now.getMonth() + 6);
            break;
          default:
            expiresAt.setMonth(now.getMonth() + 1);
        }

        subscription.expiresAt = expiresAt;
      }
    } else if (paymentData.status === 'CANCELED') {
      subscription.paymentStatus = SubscriptionPaymentStatus.CANCELED;
      subscription.isActive = false;
    } else {
      throw new BadRequestException('Unsupported payment status.');
    }

    await this.userSubscriptionRepository.save(subscription);

    return {
      success: true,
      message: `Payment status updated to ${subscription.paymentStatus}.`,
      data: subscription,
    };
  }

  async getUserSubscriptionStatus(): Promise<{
    isActive: boolean;
    currentSubscription: UserSubscription | null;
    expiresAt: Date | null;
  }> {
    const user = this.request.user as { sub: string };

    // Find the most recent active subscription
    const subscription = await this.userSubscriptionRepository.findOne({
      where: {
        userId: user.sub,
        isActive: true,
        paymentStatus: SubscriptionPaymentStatus.COMPLETE,
        expiresAt: MoreThan(new Date()), // Only not expired subscriptions
      },
      order: { createdAt: 'DESC' }, // Get the most recent
      relations: ['plan'],
    });

    return {
      isActive: !!subscription,
      currentSubscription: subscription || null,
      expiresAt: subscription?.expiresAt || null,
    };
  }
}

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SubscriptionPlan } from '../subscription-plans/entities/subscription-plan.entity';
import { SubscriptionPlansService } from '../subscription-plans/subscription-plans.service';
import { UserSubscription } from './entities/user-subscription.entity';
import { UserSubscriptionsController } from './user-subscriptions.controller';
import { UserSubscriptionsService } from './user-subscriptions.service';

@Module({
  imports: [TypeOrmModule.forFeature([UserSubscription, SubscriptionPlan])],
  controllers: [UserSubscriptionsController],
  providers: [UserSubscriptionsService, SubscriptionPlansService],
})
export class UserSubscriptionsModule {}

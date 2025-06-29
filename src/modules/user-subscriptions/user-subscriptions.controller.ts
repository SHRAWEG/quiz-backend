import { Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { Roles } from 'src/common/decorators/role.decorator';
import { Role } from 'src/common/enums/roles.enum';
import { AuthGuard } from '../auth/guards/auth.guard';
import { RolesGuard } from '../auth/guards/role.gaurd';
import { UserSubscriptionsService } from './user-subscriptions.service';

@Controller('user-subscriptions')
@UseGuards(AuthGuard, RolesGuard)
@Roles(Role.STUDENT)
@ApiBearerAuth()
export class UserSubscriptionsController {
  constructor(
    private readonly userSubscriptionsService: UserSubscriptionsService,
  ) {}

  @Get('status')
  async getSubscriptionStatus() {
    return this.userSubscriptionsService.getUserSubscriptionStatus();
  }

  @Post('/checkout/:subscriptionPlanId')
  async checkout(@Param('subscriptionPlanId') subscriptionPlanId: string) {
    console.log('Subscription Plan ID:', subscriptionPlanId);
    return await this.userSubscriptionsService.checkout(subscriptionPlanId);
  }

  @Post('/updatePayment/:data')
  async updatePayment(@Param('data') data: string) {
    console.log('Subscription Plan ID:', data);
    return await this.userSubscriptionsService.updatePaymentStatus(data);
  }
}

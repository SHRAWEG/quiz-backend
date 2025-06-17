import { Controller } from '@nestjs/common';
import { UserSubscriptionsService } from './user-subscriptions.service';

@Controller('user-subscriptions')
export class UserSubscriptionsController {
  constructor(
    private readonly userSubscriptionsService: UserSubscriptionsService,
  ) {}
}

import { PartialType } from '@nestjs/mapped-types';
import { IsBoolean, IsOptional } from 'class-validator';
import { CreateSubscriptionPlanDto } from './create-subscription-plan.dto';

export class UpdateSubscriptionPlanDto extends PartialType(
  CreateSubscriptionPlanDto,
) {
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

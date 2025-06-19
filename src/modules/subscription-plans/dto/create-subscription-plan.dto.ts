import { ApiProperty } from '@nestjs/swagger';
import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
} from 'class-validator';
import { SubscriptionPlanDuration } from 'src/common/enums/subscription-plans.enum';

export class CreateSubscriptionPlanDto {
  @ApiProperty({
    description: 'The subscriptions title',
    example: 'Monthly / Tihar Special',
  })
  @IsNotEmpty()
  @IsString()
  name: string; // e.g. Monthly, Yearly

  @ApiProperty({
    description: 'The features provided in the scheme',
    example: 'Value for money. Learn in a affordable price',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    enum: SubscriptionPlanDuration,
    description: 'The duration of the plan',
  })
  @IsEnum(SubscriptionPlanDuration)
  duration: SubscriptionPlanDuration;

  @ApiProperty({
    description: 'The duration of the plan',
    example: '100',
  })
  @IsNotEmpty()
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  price: number;
}

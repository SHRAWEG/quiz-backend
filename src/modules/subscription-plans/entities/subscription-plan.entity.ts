import { SubscriptionPlanDuration } from 'src/common/enums/subscription-plans.enum';
import { UserSubscription } from 'src/modules/user-subscriptions/entities/user-subscription.entity';
import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('subscription_plans')
export class SubscriptionPlan {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  name: string; // e.g. Monthly, Yearly

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'enum', enum: SubscriptionPlanDuration })
  duration: SubscriptionPlanDuration;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  price: number; // NPR

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(
    () => UserSubscription,
    (userSubscription) => userSubscription.plan,
  )
  userSubscriptions: UserSubscription[];
}

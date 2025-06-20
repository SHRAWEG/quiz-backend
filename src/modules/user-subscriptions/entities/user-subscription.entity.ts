import { SubscriptionPlan } from 'src/modules/subscription-plans/entities/subscription-plan.entity';
import { User } from 'src/modules/users/entities/user.entity';
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

export enum SubscriptionPaymentStatus {
  PENDING = 'PENDING',
  SUCCESS = 'SUCCESS',
  FAILED = 'FAILED',
}

export enum PaymentMethod {
  ESEWA = 'ESEWA',
  KHALTI = 'KHALTI',
}

@Entity('user_subscriptions')
export class UserSubscription {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'enum',
    enum: SubscriptionPaymentStatus,
    default: SubscriptionPaymentStatus.PENDING,
  })
  paymentStatus: SubscriptionPaymentStatus;

  @Column({
    type: 'enum',
    enum: PaymentMethod,
  })
  paymentMethod: PaymentMethod;

  @Column({ type: 'timestamp', nullable: true })
  startedAt?: Date;

  @Column({ type: 'timestamp', nullable: true })
  expiresAt?: Date;

  @Column({ default: false })
  isActive: boolean;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  total_amount: number; // NPR})

  @Column({ type: 'text' })
  product_code: string;

  @Column({ type: 'uuid' })
  transaction_uuid: string; // Unique identifier for the transaction

  @Column({ type: 'text' })
  signature: string; // Signature for transaction verification

  @Column({})
  @CreateDateColumn()
  createdAt: Date;

  @Column({ type: 'uuid' })
  userId: string;
  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ type: 'uuid' })
  subscriptionPlanId: string;
  @ManyToOne(() => SubscriptionPlan, { nullable: false })
  @JoinColumn({ name: 'subscription_plan_id' })
  plan: SubscriptionPlan;
}

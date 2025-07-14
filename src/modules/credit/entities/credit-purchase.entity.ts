import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

export enum CreditPurchaseStatus {
  PENDING = 'PENDING',
  COMPLETE = 'COMPLETE',
  CANCELED = 'CANCELED',
}

@Entity('credit_purchases')
export class CreditPurchase {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  userId: string;

  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ type: 'decimal', precision: 15, scale: 2 })
  totalAmount: number;

  @Column({ type: 'decimal', precision: 15, scale: 2 })
  creditsAwarded: number;

  @Column({
    type: 'enum',
    enum: CreditPurchaseStatus,
    default: CreditPurchaseStatus.PENDING,
  })
  status: CreditPurchaseStatus;

  @Column({ type: 'text' })
  productCode: string;

  @Column({ type: 'uuid' })
  transactionUuid: string;

  @Column({ type: 'text' })
  signature: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

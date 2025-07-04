import { CreditTransaction } from 'src/modules/credit/entities/credit-transaction.entity';
import { QuestionSetAttempt } from 'src/modules/question-set-attempt/entities/question-set-attempt.entity';
import { User } from 'src/modules/users/entities/user.entity';
import {
  Column,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  Relation,
} from 'typeorm';
import { QuestionSet } from './question-set.entity';

@Entity('question_set_purchases')
export class QuestionSetPurchase {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  userId: string;

  @Column({ type: 'uuid' })
  questionSetId: string;

  @Column({ type: 'uuid' })
  creditTransactionId: string; // Links to credit transaction

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  purchasedAt: Date;

  @Column({ type: 'boolean', default: false })
  isUsed: boolean; // Becomes true when attempted

  @Column({ type: 'uuid', nullable: true })
  questionSetAttemptId: string | null; // Add this

  // Relationships
  @ManyToOne(() => User)
  user: Relation<User>;

  @ManyToOne(() => QuestionSet)
  questionSet: Relation<QuestionSet>;

  @ManyToOne(() => CreditTransaction)
  creditTransaction: Relation<CreditTransaction>;

  @ManyToOne(() => QuestionSetAttempt, { nullable: true })
  questionSetAttempt: Relation<QuestionSetAttempt> | null;
}

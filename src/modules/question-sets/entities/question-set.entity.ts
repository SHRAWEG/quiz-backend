import { Category } from 'src/modules/categories/entities/category.entity';
import { QuestionSetAttempt } from 'src/modules/question-set-attempt/entities/question-set-attempt.entity';
import { Question } from 'src/modules/questions/entities/question.entity';
import { User } from 'src/modules/users/entities/user.entity';
import {
  Column,
  Entity,
  JoinColumn,
  JoinTable,
  ManyToMany,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  Relation,
} from 'typeorm';

export enum QuestionSetStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
}

export enum QuestionSetAccessType {
  FREE = 'free',
  PAID = 'paid',
  EXCLUSIVE = 'exclusive',
}

@Entity()
export class QuestionSet {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    default: QuestionSetAccessType.FREE,
  })
  accessType: QuestionSetAccessType;

  @Column({ type: 'integer', nullable: true })
  creditCost: number | null; // Required for EXCLUSIVE sets

  @Column({ type: 'text' })
  categoryId: string;

  @Column()
  status: QuestionSetStatus;

  @Column({ default: false })
  isTimeLimited: boolean;

  @Column({ type: 'integer', nullable: true }) // time in seconds
  timeLimitSeconds?: number;

  @Column({ type: 'text' })
  createdById: string;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @Column({
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
    onUpdate: 'CURRENT_TIMESTAMP',
  })
  updatedAt: Date;

  @ManyToOne(() => Category, {
    onDelete: 'RESTRICT', // Prevent deletion if referenced
  })
  @JoinColumn({ name: 'category_id' })
  category: Relation<Category>;

  @ManyToOne(() => User, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'created_by_id' })
  createdBy: Relation<User>;

  @Column()
  name: string;
  @ManyToMany(() => Question, (question: Question) => question.questionSets)
  @JoinTable({
    name: 'question_sets_questions',
    joinColumn: {
      name: 'question_set_id',
      referencedColumnName: 'id',
    },
    inverseJoinColumn: {
      name: 'question_id',
      referencedColumnName: 'id',
    },
  })
  questions: Question[];

  @OneToMany(() => QuestionSetAttempt, (attempt) => attempt.questionSet, {
    cascade: false,
  })
  questionSetAttempts: QuestionSetAttempt[];
}

import { Category } from 'src/modules/categories/entities/category.entity';
import { Question } from 'src/modules/questions/entities/question.entity';
import { User } from 'src/modules/users/entities/user.entity';
import {
  Column,
  Entity,
  JoinColumn,
  JoinTable,
  ManyToMany,
  ManyToOne,
  PrimaryGeneratedColumn,
  Relation,
} from 'typeorm';

export enum QuestionSetStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
}

@Entity()
export class QuestionSet {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ default: false })
  isFree: boolean;

  @Column({ type: 'text' })
  categoryId: string;

  @Column()
  status: QuestionSetStatus;

  @Column({ type: 'text' })
  createdById: string;

  @ManyToOne(() => Category, {
    cascade: ['insert', 'update', 'remove'],
  })
  @JoinColumn({ name: 'category_id' })
  category: Relation<Category>;

  @Column({ type: 'integer', nullable: true }) // time in seconds
  timeLimitSeconds?: number;

  @ManyToOne(() => User, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'created_by_id' })
  createdBy: Relation<User>;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @Column({
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
    onUpdate: 'CURRENT_TIMESTAMP',
  })
  updatedAt: Date;

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
}

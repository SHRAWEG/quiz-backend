import { Option } from 'src/modules/options/entities/option.entity';
import { SubSubject } from 'src/modules/sub-subjects/entities/sub-subject.entity';
import { Subject } from 'src/modules/subjects/entities/subject.entity';
import { User } from 'src/modules/users/entities/user.entity';
import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  Relation,
} from 'typeorm';

export enum QuestionType {
  LONG = 'long',
  SHORT = 'short',
  MCQ = 'mcq',
  TRUE_OR_FALSE = 'trueOrFalse',
  FILL_IN_THE_BLANKS = 'fillInTheBlanks',
}

export enum DifficultyLevel {
  LEVEL1 = 1,
  LEVEL2 = 2,
  LEVEL3 = 3,
  LEVEL4 = 4,
  LEVEL5 = 5,
}

@Entity('questions')
export class Question {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 500 })
  question: string;

  @Column({ type: 'enum', enum: QuestionType })
  type: QuestionType;

  @Column({ type: 'enum', enum: DifficultyLevel })
  difficulty: DifficultyLevel;

  @Column({ type: 'text' })
  subjectId: string;

  @Column({ type: 'text' })
  subSubjectId: string;

  @Column({ type: 'text' })
  createdById: string;

  @Column({ type: 'text', nullable: true })
  processedById?: string;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @Column({
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
    onUpdate: 'CURRENT_TIMESTAMP',
  })
  updatedAt: Date;

  @OneToMany(() => Option, (option) => option.question, {
    cascade: ['insert', 'update', 'remove'],
  })
  options: Option[];

  @ManyToOne(() => Subject, {
    cascade: ['insert', 'update', 'remove'],
  })
  @JoinColumn({ name: 'subject_id' })
  subject: Relation<Subject>;

  @ManyToOne(() => User, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'created_by_id' })
  createdBy: Relation<User>;

  @ManyToOne(() => User, {
    onDelete: 'CASCADE',
    nullable: true,
  })
  @JoinColumn({ name: 'processed_by_id' })
  processedBy?: Relation<User>;

  @ManyToOne(() => SubSubject, {
    cascade: ['insert', 'update', 'remove'],
  })
  @JoinColumn({ name: 'sub_subject_id' })
  subSubject: Relation<SubSubject>;
}

import {
  DifficultyLevel,
  QuestionStatus,
  QuestionType,
} from 'src/common/enums/question.enum';
import { Option } from 'src/modules/options/entities/option.entity';
import { QuestionAttempt } from 'src/modules/question-attempt/entities/question-attempt.entity';
import { QuestionSet } from 'src/modules/question-sets/entities/question-set.entity';
import { QuestionStats } from 'src/modules/question-stats/entities/question-stat.entity';
import { SubSubject } from 'src/modules/sub-subjects/entities/sub-subject.entity';
import { Subject } from 'src/modules/subjects/entities/subject.entity';
import { User } from 'src/modules/users/entities/user.entity';
import {
  Column,
  Entity,
  JoinColumn,
  ManyToMany,
  ManyToOne,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
  Relation,
} from 'typeorm';

@Entity('questions')
export class Question {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar' })
  questionText: string;

  @Column({ type: 'enum', enum: QuestionType })
  type: QuestionType;

  @Column({ type: 'enum', enum: DifficultyLevel })
  difficulty: DifficultyLevel;

  @Column({ type: 'text' })
  subjectId: string;

  @Column({ type: 'text' })
  subSubjectId: string;

  @Column({
    type: 'enum',
    enum: QuestionStatus,
    default: QuestionStatus.PENDING,
  })
  status: QuestionStatus;

  @Column({ type: 'boolean', nullable: true })
  correctAnswerBoolean?: boolean;

  @Column({ type: 'text', nullable: true })
  correctAnswerText?: string;

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
  options?: Option[];

  @OneToMany(() => QuestionAttempt, (attempt) => attempt.question)
  questionAttempts: QuestionAttempt[];

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

  @ManyToMany(() => QuestionSet, (questionSet) => questionSet.questions)
  questionSets: QuestionSet[];

  @OneToOne(() => QuestionStats, (questionStats) => questionStats.question)
  questionStats: QuestionStats;
}

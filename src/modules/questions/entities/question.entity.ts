import { Option } from 'src/modules/options/entities/option.entity';
import { SubSubject } from 'src/modules/sub-subjects/entities/sub-subject.entity';
import { Subject } from 'src/modules/subjects/entities/subject.entity';
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
  LEVEL1 = 'level1',
  LEVEL2 = 'level2',
  LEVEL3 = 'level3',
  LEVEL4 = 'level4',
  LEVEL5 = 'level5',
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

  @ManyToOne(() => SubSubject, {
    cascade: ['insert', 'update', 'remove'],
  })
  @JoinColumn({ name: 'sub_subject_id' })
  subSubject: Relation<SubSubject>;
}

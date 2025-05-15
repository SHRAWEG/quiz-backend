import { QuestionAttempt } from 'src/modules/question-attempt/entities/question-attempt.entity';
import { QuestionSet } from 'src/modules/question-sets/entities/question-set.entity';
import { User } from 'src/modules/users/entities/user.entity';
import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('question_set_attempts')
export class QuestionSetAttempt {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  userId: string;

  @Column({ type: 'uuid' })
  questionSetId: string;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  startedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  completedAt: Date;

  @Column({ default: false })
  isCompleted: boolean;

  @Column({ type: 'int', nullable: true })
  score: number;

  @Column({ type: 'float', nullable: true })
  percentage: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => QuestionSet)
  @JoinColumn({ name: 'question_set_id' })
  questionSet: QuestionSet;

  @OneToMany(
    () => QuestionAttempt,
    (questionAttempt) => questionAttempt.questionSetAttempt,
    {
      cascade: ['insert', 'update'],
    },
  )
  questionAttempts: QuestionAttempt[];
}

import { QuestionSetAttempt } from 'src/modules/question-set-attempt/entities/question-set-attempt.entity';
import { Question } from 'src/modules/questions/entities/question.entity';
import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Relation,
} from 'typeorm';

@Entity('question_attempts')
export class QuestionAttempt {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(
    () => QuestionSetAttempt,
    (questionSetAttempt) => questionSetAttempt.questionAttempts,
  )
  @JoinColumn({ name: 'questionSetAttemptId' })
  questionSetAttempt: Relation<QuestionSetAttempt>;

  @Column({ type: 'uuid' })
  questionId: string;

  @ManyToOne(() => Question)
  @JoinColumn({ name: 'question_id' })
  question: Relation<Question>;

  @Column({ type: 'text', nullable: true })
  selectedTextAnswer?: string;

  @Column({ type: 'boolean', nullable: true })
  selectedBooleanAnswer?: boolean;

  @Column({ type: 'uuid', nullable: true })
  selectedOptionId?: string; // For MCQs

  @Column({ default: false })
  isCorrect: boolean;
}

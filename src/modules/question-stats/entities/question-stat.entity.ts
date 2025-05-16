import { Question } from 'src/modules/questions/entities/question.entity';
import {
  Column,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
  Relation,
} from 'typeorm';

@Entity('question_stats')
export class QuestionStats {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @OneToOne(() => Question)
  @JoinColumn({ name: 'question_id' })
  question: Relation<Question>;

  @Column({ default: 0 })
  timesUsed: number;

  @Column({ default: 0 })
  timesAnsweredCorrectly: number;
}

import { Question } from 'src/modules/questions/entities/question.entity';
import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity({ name: 'options' })
export class Option {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  option_text: string;

  @Column()
  questionId: string;

  @Column()
  isCorrect: boolean;

  @ManyToOne(() => Question, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'question_id' })
  question: Question;
}

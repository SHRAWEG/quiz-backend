import { Question } from 'src/modules/questions/entities/question.entity';
import {
  Column,
  Entity,
  JoinTable,
  ManyToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity()
export class QuestionSet {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;
  @ManyToMany(() => Question, (question: Question) => question.questionSets)
  @JoinTable({
    name: 'question_sets_questions',
    joinColumn: {
      name: 'questionSetId',
      referencedColumnName: 'id',
    },
    inverseJoinColumn: {
      name: 'questionId',
      referencedColumnName: 'id',
    },
  })
  questions: Question[];
}

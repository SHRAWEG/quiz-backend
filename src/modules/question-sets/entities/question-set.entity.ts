import { Category } from 'src/modules/categories/entities/category.entity';
import { Question } from 'src/modules/questions/entities/question.entity';
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

@Entity()
export class QuestionSet {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ default: false })
  isFree: boolean;

  @Column({ type: 'text' })
  categoryId: string;

  @ManyToOne(() => Category, {
    cascade: ['insert', 'update', 'remove'],
  })
  @JoinColumn({ name: 'category_id' })
  category: Relation<Category>;

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

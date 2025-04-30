import { QuestionSet } from 'src/modules/question-sets/entities/question-set.entity';
import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'categories' })
export class Category {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @OneToMany(() => QuestionSet, (questionSet) => questionSet.category)
  questionSet: QuestionSet[];
}

import { Question } from 'src/modules/questions/entities/question.entity';
import { SubSubject } from 'src/modules/sub-subjects/entities/sub-subject.entity';
import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'subjects' })
export class Subject {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @OneToMany(() => SubSubject, (subSubject) => subSubject.subject)
  subSubject: SubSubject[];

  @OneToMany(() => Question, (question) => question.options)
  question: Question[];
}

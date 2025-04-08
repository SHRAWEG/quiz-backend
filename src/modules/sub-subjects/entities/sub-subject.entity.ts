import { Question } from 'src/modules/questions/entities/question.entity';
import { Subject } from 'src/modules/subjects/entities/subject.entity';
import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity({ name: 'sub_subjects' })
export class SubSubject {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column()
  subjectId: string;

  @ManyToOne(() => Subject, (subject) => subject.subSubject)
  @JoinColumn({ name: 'subject_id' })
  subject: Subject;

  @OneToMany(() => Question, (question) => question.subSubject)
  questions: Question[];
}

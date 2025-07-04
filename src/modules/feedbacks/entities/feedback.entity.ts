import { User } from 'src/modules/users/entities/user.entity';
import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('feedbacks')
export class Feedback {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar' })
  feedback: string;

  @Column({ type: 'text' })
  fromId: string;

  @ManyToOne(() => User, {
    onDelete: 'SET NULL', // 👈 This is the key
    nullable: true,
  })
  @JoinColumn({ name: 'from_id' })
  from?: User;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;
}

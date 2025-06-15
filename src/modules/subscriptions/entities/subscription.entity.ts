import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('subscription')
export class Subscription {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'text' })
  name: string;

  @Column({ type: 'float' })
  price: number;

  @Column({ type: 'string' })
  duration: string;
}

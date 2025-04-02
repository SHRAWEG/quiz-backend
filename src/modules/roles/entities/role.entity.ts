import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { UserRole } from '../../users/entities/user-role.entity';

@Entity({ name: 'roles' }) // Table name
export class Role {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  name: string;

  @OneToMany(() => UserRole, (userRole: UserRole) => userRole.role)
  userRoles: UserRole[];
}

import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity({ name: 'oauth_authorization_codes' })
export class OAuthAuthorizationCode {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  code: string;

  @Column()
  userId: string;

  @Column()
  clientId: string;

  @Column()
  redirectUri: string;

  @Column('text', { array: true, nullable: true })
  scopes?: string[];

  @Column({ nullable: true })
  codeChallenge?: string;

  @Column({ nullable: true })
  codeChallengeMethod?: string;

  @Column({ type: 'timestamp' })
  expiresAt: Date;

  @Column({ default: false })
  used: boolean;

  @CreateDateColumn()
  createdAt: Date;
}

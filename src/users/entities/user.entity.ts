import { Conversation } from './../../conversation/entities/conversation.entity';
import { SocialAccount } from './../../social_accounts/entities/social_account.entity';
import { Column, DeleteDateColumn, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';


@Entity()
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  // Permitimos NULL para usuarios de SSO sin email
  @Column({ unique: true, nullable: true })
  email: string | null; 


  @Column({ nullable: true, select: false })
  password: string;


  @DeleteDateColumn()
  deletedAt: Date;

  @OneToMany(() => SocialAccount, (socialAccount) => socialAccount.user)
  socialAccounts: SocialAccount[];

  @OneToMany(() => Conversation, (conversation) => conversation.user)
  conversations: Conversation[];
}
import { SocialAccount } from './../../social_accounts/entities/social_account.entity';
import { Column, DeleteDateColumn, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';

import { Role } from 'src/common/enums/rol.enum';


@Entity()
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  // Permitimos NULL para usuarios de SSO sin email
  @Column({ unique: true, nullable: true })
  email: string | null; 

  // Facebook ID
  @Column({ unique: true, nullable: true })
  facebookId: string | null; 

  // ⬅️ AGREGAR: TikTok ID
  @Column({ unique: true, nullable: true })
  tiktokId: string | null;

  @Column({ nullable: true, select: false })
  password: string;

  @Column({ type: 'enum', default: Role.USER, enum: Role })
  role: Role;

  @DeleteDateColumn()
  deletedAt: Date;

  @OneToMany(() => SocialAccount, (socialAccount) => socialAccount.user)
  socialAccounts: SocialAccount[];
}
import { User } from 'src/users/entities/user.entity';
import { 
    Column, 
    CreateDateColumn, 
    Entity, 
    ManyToOne, 
    PrimaryGeneratedColumn, 
    UpdateDateColumn 
  } from 'typeorm';

  @Entity('social_accounts')
  export class SocialAccount {
    @PrimaryGeneratedColumn()
    id: number;
  
    @Column({ name: 'user_id' })
    userId: number;
  
    @Column({ length: 50 })
    provider: string; // 'facebook', 'instagram', 'tiktok', etc.
  
    @Column({ name: 'provider_id', length: 255, nullable: true })
    providerId: string; // ID del usuario en Facebook/Instagram/TikTok
  
    // ⬅️ AGREGAR ESTE CAMPO
    @Column({ length: 255, nullable: true })
    username: string; // Username del usuario en la red social
  
    @Column({ name: 'access_token', type: 'text' })
    accessToken: string; // Token para publicar
  
    @Column({ name: 'refresh_token', type: 'text', nullable: true })
    refreshToken: string;
  
    @Column({ name: 'expires_at', type: 'timestamp', nullable: true })
    expiresAt: Date;
  
    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;
  
    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;
  
    // Relación con User
    @ManyToOne(() => User, { onDelete: 'CASCADE' })
    user: User;
  }
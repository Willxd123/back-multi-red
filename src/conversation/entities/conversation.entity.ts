import { Message } from './../../chatbot/entities/message.entity';

import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity('conversations')
export class Conversation {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'user_id' })
  userId: number;

  @Column({ length: 255 })
  title: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Relaciones
  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  user: User;

  @OneToMany(() => Message, (message) => message.conversation, {
    cascade: true, // Esto permite guardar mensajes automáticamente
    eager: false   // No cargar automáticamente (usar relations explícitamente)
  })
  messages: Message[];
}

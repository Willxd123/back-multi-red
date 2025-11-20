import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Conversation } from './entities/conversation.entity';
import { Message } from 'src/chatbot/entities/message.entity';

@Injectable()
export class ConversationService {
  constructor(
    @InjectRepository(Conversation)
    private readonly conversationRepository: Repository<Conversation>,
    @InjectRepository(Message)
    private readonly messageRepository: Repository<Message>, // Inject MessageRepository
  ) {}

  /**
   * POST /conversations
   * Crear nueva conversación vacía
   */
  async create(userId: number) {
    const conversation = this.conversationRepository.create({
      userId,
      title: 'Nueva conversación', // Título por defecto, se actualizará con el primer mensaje
    });

    const saved = await this.conversationRepository.save(conversation);

    return {
      id: saved.id,
      title: saved.title,
      createdAt: saved.createdAt,
      updatedAt: saved.updatedAt,
    };
  }

  /**
   * GET /conversations
   * Listar todas las conversaciones del usuario
   */
  async findAll(userId: number) {
    const conversations = await this.conversationRepository.find({
      where: { userId },
      order: { updatedAt: 'DESC' },
    });

    return conversations.map((conv) => ({
      id: conv.id,
      title: conv.title,
      createdAt: conv.createdAt,
      updatedAt: conv.updatedAt,
    }));
  }

  /**
   * GET /conversations/:id
   * Ver historial completo de una conversación
   */
  async findOne(userId: number, conversationId: number) {
    const conversation = await this.conversationRepository.findOne({
      where: { id: conversationId, userId },
      relations: ['messages'],
    });
  
    if (!conversation) {
      throw new NotFoundException('Conversación no encontrada');
    }
  
    console.log('🔍 Conversación encontrada:', conversation.id);
    console.log('📨 Mensajes cargados:', conversation.messages?.length || 0);
  
    // Verificar si messages existe
    if (!conversation.messages) {
      console.warn('⚠️ No se cargaron mensajes, intentando carga manual');
      
      // Cargar mensajes manualmente como fallback
      const messages = await this.messageRepository.find({
        where: { conversationId: conversation.id },
        order: { createdAt: 'ASC' },
      });
  
      return {
        id: conversation.id,
        title: conversation.title,
        createdAt: conversation.createdAt,
        updatedAt: conversation.updatedAt,
        messages: messages.map((msg) => ({
          id: msg.id,
          role: msg.role,
          content: msg.content,
          createdAt: msg.createdAt,
        })),
      };
    }
  
    // Ordenar mensajes por fecha
    const sortedMessages = conversation.messages.sort(
      (a, b) => a.createdAt.getTime() - b.createdAt.getTime(),
    );
  
    return {
      id: conversation.id,
      title: conversation.title,
      createdAt: conversation.createdAt,
      updatedAt: conversation.updatedAt,
      messages: sortedMessages.map((msg) => ({
        id: msg.id,
        role: msg.role,
        content: msg.content,
        createdAt: msg.createdAt,
      })),
    };
  }

  /**
   * DELETE /conversations/:id
   * Eliminar conversación
   */
  async remove(userId: number, conversationId: number) {
    const conversation = await this.conversationRepository.findOne({
      where: { id: conversationId, userId },
    });

    if (!conversation) {
      throw new NotFoundException('Conversación no encontrada');
    }

    await this.conversationRepository.remove(conversation);

    return {
      success: true,
      message: 'Conversación eliminada exitosamente',
    };
  }

  /**
   * PATCH /conversations/:id/title
   * Actualizar título de conversación
   */
  async updateTitle(userId: number, conversationId: number, newTitle: string) {
    const conversation = await this.conversationRepository.findOne({
      where: { id: conversationId, userId },
    });

    if (!conversation) {
      throw new NotFoundException('Conversación no encontrada');
    }

    conversation.title = newTitle;
    await this.conversationRepository.save(conversation);

    return {
      success: true,
      message: 'Título actualizado exitosamente',
      title: newTitle,
    };
  }
}
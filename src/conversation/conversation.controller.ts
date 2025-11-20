import {
  Controller,
  Get,
  Post,
  Delete,
  Patch,
  Param,
  Body,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { ConversationService } from './conversation.service';
import { AuthGuard } from '../auth/guard/auth.guard';
import { ActiveUser } from '../common/decorators/active-user.decorator';
import { UserActiveInterface } from '../common/interfaces/user-active.interface';
import { ApiBearerAuth, ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('conversations')
@ApiBearerAuth()
@Controller('conversations')
@UseGuards(AuthGuard) // ⬅️ Guard global para todo el controller
export class ConversationController {
  constructor(private readonly conversationService: ConversationService) {}

  /**
   * POST /conversations
   * Crear nueva conversación (vacía)
   */
  @Post()
  @ApiOperation({ summary: 'Crear nueva conversación' })
  @ApiResponse({ status: 201, description: 'Conversación creada' })
  async create(@ActiveUser() user: UserActiveInterface) {
    return await this.conversationService.create(user.id);
  }

  /**
   * GET /conversations
   * Listar todas las conversaciones (para sidebar)
   */
  @Get()
  @ApiOperation({ summary: 'Listar todas las conversaciones del usuario' })
  @ApiResponse({ status: 200, description: 'Lista de conversaciones' })
  async findAll(@ActiveUser() user: UserActiveInterface) {
    return await this.conversationService.findAll(user.id);
  }

  /**
   * GET /conversations/:id
   * Ver historial completo de una conversación
   */
  @Get(':id')
  @ApiOperation({ summary: 'Obtener historial completo de conversación' })
  @ApiResponse({ status: 200, description: 'Conversación con todos los mensajes' })
  async findOne(
    @ActiveUser() user: UserActiveInterface,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return await this.conversationService.findOne(user.id, id);
  }

  /**
   * DELETE /conversations/:id
   * Eliminar conversación
   */
  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar conversación' })
  @ApiResponse({ status: 200, description: 'Conversación eliminada' })
  async remove(
    @ActiveUser() user: UserActiveInterface,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return await this.conversationService.remove(user.id, id);
  }

  /**
   * PATCH /conversations/:id/title
   * Actualizar título de conversación
   */
  @Patch(':id/title')
  @ApiOperation({ summary: 'Actualizar título de conversación' })
  @ApiResponse({ status: 200, description: 'Título actualizado' })
  async updateTitle(
    @ActiveUser() user: UserActiveInterface,
    @Param('id', ParseIntPipe) id: number,
    @Body('title') title: string,
  ) {
    return await this.conversationService.updateTitle(user.id, id, title);
  }
}
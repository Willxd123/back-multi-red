import { SocialAccountsService } from './../social_accounts/social_accounts.service';
import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { CreateFacebookPostDto } from './dto/create-facebook-post.dto';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { InjectRepository } from '@nestjs/typeorm'; // ⬅️ AGREGAR
import { Repository } from 'typeorm'; // ⬅️ AGREGAR
import { Message } from '../chatbot/entities/message.entity'; // ⬅️ AGREGAR
import * as fs from 'fs'; // ⬅️ AGREGAR

@Injectable()
export class PostsService {

  constructor(
    private readonly socialAccountsService: SocialAccountsService,
    private readonly httpService: HttpService,
    @InjectRepository(Message) // ⬅️ AGREGAR
    private readonly messageRepository: Repository<Message>, // ⬅️ AGREGAR
  ) {}

  async publishToTikTok(userId: number, videoPath: string, caption: string) {
    const tiktokAccount = await this.socialAccountsService.getAccount(userId, 'tiktok');

    if (!tiktokAccount) {
      throw new NotFoundException('No tienes TikTok conectado');
    }

    const accessToken = tiktokAccount.accessToken;

    try {
      const axios = require('axios');
      
      const videoBuffer = fs.readFileSync(videoPath);
      const videoSize = videoBuffer.length;
      
      const initResponse = await firstValueFrom(
        this.httpService.post(
          'https://open.tiktokapis.com/v2/post/publish/video/init/',
          {
            post_info: {
              title: caption,
              privacy_level: 'SELF_ONLY',
              disable_duet: false,
              disable_comment: false,
              disable_stitch: false,
              video_cover_timestamp_ms: 1000,
            },
            source_info: {
              source: 'FILE_UPLOAD',
              video_size: videoSize,
              chunk_size: videoSize,
              total_chunk_count: 1,
            },
          },
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
          }
        )
      );

      const { publish_id, upload_url } = initResponse.data.data;

      console.log('📤 Subiendo video...');
      
      await axios.put(upload_url, videoBuffer, {
        headers: {
          'Content-Type': 'video/mp4',
          'Content-Length': videoSize.toString(),
          'Content-Range': `bytes 0-${videoSize - 1}/${videoSize}`,
        },
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
      });

      console.log('✅ Video subido exitosamente a TikTok');

      return {
        success: true,
        message: 'Video publicado en TikTok exitosamente',
        publishId: publish_id,
        note: 'El video fue subido como privado. Revisa tu cuenta de TikTok.',
      };
    } catch (error) {
      console.error('❌ Error al publicar en TikTok:', error.response?.data || error.message);
      console.error('❌ Status:', error.response?.status);
      console.error('❌ Headers:', error.response?.headers);
      
      if (error.response?.data?.error) {
        const tiktokError = error.response.data.error;
        throw new BadRequestException(
          `Error de TikTok: ${tiktokError.message} (Code: ${tiktokError.code})`
        );
      }

      throw new BadRequestException('No se pudo publicar en TikTok: ' + error.message);
    }
  }


  async publishTikTokFromMessage(userId: number, messageId: number) {
    // 1. Buscar el mensaje en la base de datos
    const message = await this.messageRepository.findOne({
      where: { id: messageId },
    });

    if (!message) {
      throw new NotFoundException(`Mensaje con ID ${messageId} no encontrado`);
    }

    // 2. Validar que sea un mensaje del asistente
    if (message.role !== 'assistant') {
      throw new BadRequestException('Solo se pueden publicar mensajes del asistente');
    }

    // 3. Extraer contenido de TikTok
    const content = message.content;
    
    if (!content.TikTok) {
      throw new NotFoundException('Este mensaje no contiene contenido de TikTok');
    }

    const tiktokContent = content.TikTok;
    
    // 4. Validar que tenga media_info
    if (!tiktokContent.media_info) {
      throw new BadRequestException('El mensaje no tiene información de medios');
    }

    const { descripcion, ruta, fileName } = tiktokContent.media_info;

    // 5. Validar que existan los datos necesarios
    if (!descripcion) {
      throw new BadRequestException('No hay descripción para publicar');
    }

    if (!ruta || !fileName) {
      throw new BadRequestException('No hay video para publicar');
    }

    // 6. Validar que el archivo existe
    if (!fs.existsSync(ruta)) {
      throw new NotFoundException(`El video no existe en la ruta: ${ruta}`);
    }

    // 7. Publicar usando el método existente
    console.log(`📱 Publicando en TikTok desde mensaje ${messageId}`);
    console.log(`📝 Descripción: ${descripcion}`);
    console.log(`🎥 Video: ${fileName}`);

    const result = await this.publishToTikTok(userId, ruta, descripcion);

    // 8. Actualizar el mensaje con información de publicación
    await this.messageRepository.update(
      { id: messageId },
      {
        content: {
          ...content,
          TikTok: {
            ...tiktokContent,
            publicacion: {
              estado: 'publicado',
              publishId: result.publishId,
              mensaje: result.message,
              fecha: new Date().toISOString(),
            },
          },
        },
      },
    );

    return {
      ...result,
      messageId,
      descripcion,
      fileName,
    };
  }
}
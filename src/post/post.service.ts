import { InstagramService } from './../instagram/instagram.service';
import { FacebookService } from './../facebook/facebook.service';
import { SocialAccountsService } from './../social_accounts/social_accounts.service';
import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { CreateFacebookPostDto } from './dto/create-facebook-post.dto';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { InjectRepository } from '@nestjs/typeorm'; // ⬅️ AGREGAR
import { Repository } from 'typeorm'; // ⬅️ AGREGAR
import { Message } from '../chatbot/entities/message.entity'; // ⬅️ AGREGAR
import * as fs from 'fs'; // ⬅️ AGREGAR
import path from 'path';

@Injectable()
export class PostsService {
  constructor(
    private readonly socialAccountsService: SocialAccountsService,
    private readonly httpService: HttpService,
    private readonly facebookService: FacebookService,
    private readonly instagramService: InstagramService,
    @InjectRepository(Message)
    private readonly messageRepository: Repository<Message>,
  ) {}

  async publishToTikTok(userId: number, videoPath: string, caption: string) {
    const tiktokAccount = await this.socialAccountsService.getAccount(
      userId,
      'tiktok',
    );

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
          },
        ),
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
      console.error(
        '❌ Error al publicar en TikTok:',
        error.response?.data || error.message,
      );
      console.error('❌ Status:', error.response?.status);
      console.error('❌ Headers:', error.response?.headers);

      if (error.response?.data?.error) {
        const tiktokError = error.response.data.error;
        throw new BadRequestException(
          `Error de TikTok: ${tiktokError.message} (Code: ${tiktokError.code})`,
        );
      }

      throw new BadRequestException(
        'No se pudo publicar en TikTok: ' + error.message,
      );
    }
  }

  async publishTikTokFromMessage(userId: number, messageId: number) {
    const message = await this.messageRepository.findOne({
      where: { id: messageId },
    });

    if (!message) {
      throw new NotFoundException(`Mensaje con ID ${messageId} no encontrado`);
    }

    if (message.role !== 'assistant') {
      throw new BadRequestException(
        'Solo se pueden publicar mensajes del asistente',
      );
    }

    const content = message.content;

    if (!content.TikTok) {
      throw new NotFoundException(
        'Este mensaje no contiene contenido de TikTok',
      );
    }

    const tiktokContent = content.TikTok;

    if (!tiktokContent.media_info) {
      throw new BadRequestException(
        'El mensaje no tiene información de medios',
      );
    }

    const { descripcion, ruta, fileName } = tiktokContent.media_info;

    if (!descripcion) {
      throw new BadRequestException('No hay descripción para publicar');
    }

    if (!ruta || !fileName) {
      throw new BadRequestException('No hay video para publicar');
    }

    if (!fs.existsSync(ruta)) {
      throw new NotFoundException(`El video no existe en la ruta: ${ruta}`);
    }

    console.log(`📱 Publicando en TikTok desde mensaje ${messageId}`);
    console.log(`📝 Descripción: ${descripcion}`);
    console.log(`🎥 Video: ${fileName}`);

    const result = await this.publishToTikTok(userId, ruta, descripcion);

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

  async publishFacebookFromMessage(userId: number, messageId: number) {
    const message = await this.messageRepository.findOne({
      where: { id: messageId },
    });

    if (!message) {
      throw new NotFoundException(`Mensaje con ID ${messageId} no encontrado`);
    }

    if (message.role !== 'assistant') {
      throw new BadRequestException('Solo se pueden publicar mensajes del asistente');
    }

    const content = message.content;
    
    if (!content.Facebook) {
      throw new NotFoundException('Este mensaje no contiene contenido de Facebook');
    }

    const facebookContent = content.Facebook;
    
    if (!facebookContent.media_info) {
      throw new BadRequestException('El mensaje no tiene información de medios');
    }

    // ✅ Buscar descripción en ambos lugares
    const descripcion = facebookContent.descripcion || facebookContent.media_info.descripcion;
    const { ruta, fileName } = facebookContent.media_info;

    if (!descripcion) {
      throw new BadRequestException('No hay descripción para publicar');
    }

    if (!ruta || !fileName) {
      throw new BadRequestException('No hay imagen para publicar');
    }

    if (!fs.existsSync(ruta)) {
      throw new NotFoundException(`La imagen no existe en la ruta: ${ruta}`);
    }

    console.log(`📱 Publicando en Facebook desde mensaje ${messageId}`);
    console.log(`📝 Descripción: ${descripcion}`);
    console.log(`🖼️ Imagen: ${fileName}`);

    const result = await this.facebookService.publishPhoto(userId, ruta, descripcion);

    await this.messageRepository.update(
      { id: messageId },
      {
        content: {
          ...content,
          Facebook: {
            ...facebookContent,
            publicacion: {
              estado: 'publicado',
              postId: result.postId,
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

  async publishInstagramFromMessage(userId: number, messageId: number) {
    const message = await this.messageRepository.findOne({
      where: { id: messageId },
    });

    if (!message) {
      throw new NotFoundException(`Mensaje con ID ${messageId} no encontrado`);
    }

    if (message.role !== 'assistant') {
      throw new BadRequestException('Solo se pueden publicar mensajes del asistente');
    }

    const content = message.content;
    
    if (!content.Instagram) {
      throw new NotFoundException('Este mensaje no contiene contenido de Instagram');
    }

    const instagramContent = content.Instagram;
    
    if (!instagramContent.media_info) {
      throw new BadRequestException('El mensaje no tiene información de medios');
    }

    // Buscar descripción en ambos lugares
    const descripcion = instagramContent.descripcion || instagramContent.media_info.descripcion;
    let { ruta, fileName } = instagramContent.media_info;

    if (!descripcion) {
      throw new BadRequestException('No hay caption para publicar');
    }

    if (!ruta || !fileName) {
      throw new BadRequestException('No hay imagen para publicar');
    }

    // ✅ Normalizar ruta (convertir \\ a / y resolver path absoluto)
    ruta = path.normalize(ruta);

    if (!fs.existsSync(ruta)) {
      throw new NotFoundException(`La imagen no existe en la ruta: ${ruta}`);
    }

    console.log(`📱 Publicando en Instagram desde mensaje ${messageId}`);
    console.log(`📝 Caption: ${descripcion}`);
    console.log(`🖼️ Imagen: ${fileName}`);
    console.log(`📂 Ruta normalizada: ${ruta}`);

    const result = await this.instagramService.publishPhoto(userId, ruta, descripcion);

    await this.messageRepository.update(
      { id: messageId },
      {
        content: {
          ...content,
          Instagram: {
            ...instagramContent,
            publicacion: {
              estado: 'publicado',
              postId: result.postId,
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


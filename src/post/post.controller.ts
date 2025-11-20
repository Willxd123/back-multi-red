import { CreateFacebookPostDto } from './dto/create-facebook-post.dto';
import { PostsService } from './post.service';
import { Controller, Post, Body, Get, UseGuards, UseInterceptors, UploadedFile, BadRequestException } from '@nestjs/common';

import { AuthGuard } from 'src/auth/guard/auth.guard';
import { ActiveUser } from 'src/common/decorators/active-user.decorator';
import { UserActiveInterface } from 'src/common/interfaces/user-active.interface';
import { ApiBearerAuth, ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';  // ⬅️ Para configurar el storage
import * as path from 'path';          // ⬅️ Para manejar rutas de archivos
import * as fs from 'fs';              // ⬅️ Para eliminar archivos
import { PublishFromMessageDto } from './dto/publish-from-message.dto';
@ApiTags('posts')
@ApiBearerAuth()
@Controller('posts')
@UseGuards(AuthGuard) // Requiere autenticación
export class PostsController {
  constructor(private readonly postsService: PostsService) {}

  /**
   * Publicar video en TikTok
   */
  @Post('tiktok/video')
  @UseGuards(AuthGuard)
  @UseInterceptors(FileInterceptor('video', {
    storage: diskStorage({
      destination: './uploads/videos',
      filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, `tiktok-${uniqueSuffix}${ext}`);
      },
    }),
    fileFilter: (req, file, cb) => {
      // Solo videos mp4, mov, avi
      if (file.mimetype.match(/\/(mp4|mov|avi|quicktime)$/)) {
        cb(null, true);
      } else {
        cb(new Error('Solo se permiten archivos de video (mp4, mov, avi)'), false);
      }
    },
    limits: {
      fileSize: 500 * 1024 * 1024, // 500MB máximo
    },
  }))
  async publishToTikTok(
    @ActiveUser() user: UserActiveInterface,
    @UploadedFile() video: Express.Multer.File,
    @Body('caption') caption: string,
  ) {
    if (!video) {
      throw new BadRequestException('Se requiere un archivo de video');
    }

    if (!caption) {
      throw new BadRequestException('Se requiere un caption/descripción');
    }

    try {
      const result = await this.postsService.publishToTikTok(
        user.id,
        video.path,
        caption,
      );

      // Eliminar archivo temporal después de publicar
      fs.unlinkSync(video.path);

      return result;
    } catch (error) {
      // Eliminar archivo en caso de error
      if (fs.existsSync(video.path)) {
        fs.unlinkSync(video.path);
      }
      throw error;
    }
  }

  @Post('tiktok/publish-from-message')
  @UseGuards(AuthGuard)
  @ApiOperation({ 
    summary: 'Publicar en TikTok desde contenido generado por IA',
    description: 'Publica en TikTok usando la descripción y video ya generados y guardados en un mensaje'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Video publicado exitosamente en TikTok' 
  })
  @ApiResponse({ 
    status: 404, 
    description: 'Mensaje no encontrado o no contiene contenido de TikTok' 
  })
  async publishFromMessage(
    @ActiveUser() user: UserActiveInterface,
    @Body() dto: PublishFromMessageDto,
  ) {
    return this.postsService.publishTikTokFromMessage(user.id, dto.messageId);
  }
}
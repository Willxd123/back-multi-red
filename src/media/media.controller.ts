import { Controller, Get, Param, Res, StreamableFile, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { MediaService } from './media.service';
import { AuthGuard } from '../auth/guard/auth.guard';
import { ApiBearerAuth, ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';

@ApiTags('media')
@ApiBearerAuth()
@Controller('media')
// ✅ Solo usuarios autenticados pueden acceder
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

  /**
   * GET /api/media/:filename
   * Sirve archivos (imágenes/videos) del directorio outputs
   */
  @Get(':filename')
  @ApiOperation({ 
    summary: 'Obtener archivo multimedia',
    description: 'Sirve imágenes y videos generados por el chatbot desde el directorio outputs'
  })
  @ApiParam({
    name: 'filename',
    description: 'Nombre del archivo (ej: imagen_123.png, video_456.mp4)',
    example: 'imagen_1763675333939.png'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Archivo encontrado y servido correctamente' 
  })
  @ApiResponse({ 
    status: 404, 
    description: 'Archivo no encontrado' 
  })
  async getMedia(
    @Param('filename') filename: string,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    const { stream, mimeType, size } = await this.mediaService.getFile(filename);

    // Configurar headers de respuesta
    res.set({
      'Content-Type': mimeType,
      'Content-Length': size,
      'Cache-Control': 'public, max-age=3600', // Cache de 1 hora
    });

    return stream;
  }
}
import { S3Service } from './../aws/s3.service';
import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import axios from 'axios';


@Injectable()
export class LinkedinService {
  private readonly makeWebhookUrl = 'https://hook.eu1.make.com/9pytud0s71kekkcgi2mlvi5lr7dcqoor';

  constructor(
    private readonly configService: ConfigService,
    private readonly s3Service: S3Service,
  ) {}

  /**
   * Publicar imagen en LinkedIn mediante Make.com
   */
  async publishPost(userId: number, imagePath: string, description: string) {
    console.log('🔗 Publicando en LinkedIn vía Make.com...');

    // 1. Validar que el archivo existe
    if (!fs.existsSync(imagePath)) {
      throw new NotFoundException(`La imagen no existe en: ${imagePath}`);
    }

    try {
      // 2. Subir imagen a S3 para obtener URL pública
      console.log('📤 Subiendo imagen a S3...');
      const imageBuffer = fs.readFileSync(imagePath);
      const imageUrl = await this.s3Service.uploadLinkedInImage(imageBuffer);

      console.log(`✅ Imagen subida a S3: ${imageUrl}`);

      // 3. Enviar datos a Make.com webhook
      console.log('🚀 Enviando a Make.com...');

      const payload = {
        url_imagen: imageUrl,
        descripcion: description,
      };

      const response = await axios.post(this.makeWebhookUrl, payload, {
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: 30000,
      });

      console.log('✅ Respuesta de Make.com:', response.status);

      return {
        success: true,
        message: 'Publicación enviada a LinkedIn exitosamente',
        imageUrl,
        platform: 'linkedin',
        makeResponse: response.data,
      };

    } catch (error) {
      console.error('❌ Error al publicar en LinkedIn:', error.response?.data || error.message);

      if (error.response?.data) {
        throw new BadRequestException(
          `Error de Make.com: ${JSON.stringify(error.response.data)}`
        );
      }

      throw new BadRequestException('No se pudo publicar en LinkedIn: ' + error.message);
    }
  }
}
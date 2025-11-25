import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import axios from 'axios';
import { S3Service } from '../aws/s3.service'; // ✅ IMPORTAR

@Injectable()
export class InstagramService {
  private readonly baseUrl = 'https://graph.facebook.com/v18.0';

  constructor(
    private readonly configService: ConfigService,
    private readonly s3Service: S3Service, // ✅ INYECTAR
  ) {}

  /**
   * Verificar credenciales de Instagram
   */
  async verifyCredentials() {
    const accessToken = this.configService.get<string>('INSTAGRAM_PAGE_ACCESS_TOKEN');
    const instagramAccountId = this.configService.get<string>('INSTAGRAM_BUSINESS_ACCOUNT_ID');

    if (!accessToken || !instagramAccountId) {
      throw new BadRequestException('Credenciales de Instagram no configuradas');
    }

    try {
      console.log('🔍 Verificando cuenta de Instagram...');
      console.log('📋 Instagram Business Account ID:', instagramAccountId);

      const response = await axios.get(
        `${this.baseUrl}/${instagramAccountId}`,
        {
          params: {
            fields: 'id,username,name,profile_picture_url',
            access_token: accessToken,
          },
          timeout: 30000,
        }
      );

      console.log('✅ Cuenta verificada:', response.data);

      return {
        success: true,
        message: 'Credenciales de Instagram válidas',
        account: response.data,
      };
    } catch (error) {
      console.error('❌ Error verificando credenciales:', error.response?.data || error.message);
      
      if (error.response?.data?.error) {
        const igError = error.response.data.error;
        return {
          success: false,
          error: `Error de Instagram: ${igError.message} (Code: ${igError.code})`,
          suggestion: 'Verifica que INSTAGRAM_BUSINESS_ACCOUNT_ID y INSTAGRAM_PAGE_ACCESS_TOKEN sean correctos',
        };
      }

      throw new BadRequestException('Error al verificar credenciales: ' + error.message);
    }
  }

  /**
   * Publicar foto en Instagram
   */
  async publishPhoto(userId: number, imagePath: string, caption: string) {
    const accessToken = this.configService.get<string>('INSTAGRAM_PAGE_ACCESS_TOKEN');
    const instagramAccountId = this.configService.get<string>('INSTAGRAM_BUSINESS_ACCOUNT_ID');

    if (!accessToken || !instagramAccountId) {
      throw new BadRequestException('Credenciales de Instagram no configuradas en .env');
    }

    console.log('🔍 Instagram Business Account ID:', instagramAccountId);

    if (!fs.existsSync(imagePath)) {
      throw new NotFoundException(`La imagen no existe en: ${imagePath}`);
    }

    try {
      // ✅ 1. Leer imagen y subir a S3
      console.log('📤 Subiendo imagen a S3...');
      const imageBuffer = fs.readFileSync(imagePath);
      const imageUrl = await this.s3Service.uploadInstagramImage(imageBuffer);

      // ✅ 2. Crear contenedor de medios en Instagram
      console.log('📸 Creando contenedor de medios en Instagram...');

      const containerResponse = await axios.post(
        `${this.baseUrl}/${instagramAccountId}/media`,
        null,
        {
          params: {
            image_url: imageUrl,
            caption: caption,
            access_token: accessToken,
          },
          timeout: 30000,
        }
      );

      const creationId = containerResponse.data.id;
      console.log(`✅ Contenedor creado con ID: ${creationId}`);

      // ✅ 3. Esperar 3 segundos (Instagram necesita procesar la imagen)
      console.log('⏳ Esperando 3 segundos para que Instagram procese...');
      await new Promise(resolve => setTimeout(resolve, 3000));

      // ✅ 4. Publicar el contenedor
      console.log('🚀 Publicando en Instagram...');

      const publishResponse = await axios.post(
        `${this.baseUrl}/${instagramAccountId}/media_publish`,
        null,
        {
          params: {
            creation_id: creationId,
            access_token: accessToken,
          },
          timeout: 30000,
        }
      );

      const postId = publishResponse.data.id;
      console.log(`✅ Publicado en Instagram con ID: ${postId}`);

      return {
        success: true,
        message: 'Imagen publicada en Instagram exitosamente',
        postId,
        imageUrl,
        platform: 'instagram',
      };

    } catch (error) {
      console.error('❌ Error al publicar en Instagram:', error.response?.data || error.message);

      if (error.response?.data?.error) {
        const igError = error.response.data.error;
        throw new BadRequestException(
          `Error de Instagram: ${igError.message} (Code: ${igError.code})`
        );
      }

      throw new BadRequestException('No se pudo publicar en Instagram: ' + error.message);
    }
  }
}
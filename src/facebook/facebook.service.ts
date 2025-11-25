import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SocialAccountsService } from '../social_accounts/social_accounts.service';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import FormData from 'form-data';
import * as fs from 'fs';

@Injectable()
export class FacebookService {
  private readonly baseUrl = 'https://graph.facebook.com/v18.0';

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
  ) {}

  /**
   * Publicar foto en página de Facebook
   */
  async publishPhoto(userId: number, imagePath: string, message: string) {
    // 1. Obtener credenciales del .env (tu página personal)
    const pageAccessToken = this.configService.get<string>('FACEBOOK_PAGE_ACCESS_TOKEN');
    const pageId = this.configService.get<string>('FACEBOOK_PAGE_ID');

    if (!pageId || !pageAccessToken) {
      throw new BadRequestException('Credenciales de Facebook no configuradas en .env');
    }

    // 2. Validar que el archivo existe
    if (!fs.existsSync(imagePath)) {
      throw new NotFoundException(`La imagen no existe en: ${imagePath}`);
    }

    try {
      // 3. Crear FormData con la imagen
      const form = new FormData();
      form.append('message', message);
      form.append('access_token', pageAccessToken);
      form.append('source', fs.createReadStream(imagePath));

      // 4. Publicar en Facebook
      const url = `${this.baseUrl}/${pageId}/photos`;

      console.log('📤 Publicando en Facebook Page...');
      
      const response = await firstValueFrom(
        this.httpService.post(url, form, {
          headers: form.getHeaders(),
          maxContentLength: Infinity,
          maxBodyLength: Infinity,
        })
      );

      const postId = response.data.post_id || response.data.id;

      if (!postId) {
        throw new BadRequestException('Facebook no devolvió un ID de publicación');
      }

      console.log(`✅ Publicado en Facebook con ID: ${postId}`);

      return {
        success: true,
        message: 'Imagen publicada en Facebook exitosamente',
        postId,
        platform: 'facebook',
      };

    } catch (error) {
      console.error('❌ Error al publicar en Facebook:', error.response?.data || error.message);
      
      if (error.response?.data?.error) {
        const fbError = error.response.data.error;
        throw new BadRequestException(
          `Error de Facebook: ${fbError.message} (Code: ${fbError.code})`
        );
      }

      throw new BadRequestException('No se pudo publicar en Facebook: ' + error.message);
    }
  }
}









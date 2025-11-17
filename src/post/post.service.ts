import { SocialAccountsService } from './../social_accounts/social_accounts.service';
import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { CreateFacebookPostDto } from './dto/create-facebook-post.dto';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class PostsService {
  private readonly FACEBOOK_GRAPH_API = 'https://graph.facebook.com/v18.0';

  constructor(
    private readonly socialAccountsService: SocialAccountsService,
    private readonly httpService: HttpService,
  ) {}

  /**
   * Publicar en una página de Facebook del usuario
   * Funciona sin permisos especiales en modo desarrollo
   */
  async publishToFacebook(userId: number, postDto: CreateFacebookPostDto) {
    // 1. Verificar que el usuario tenga Facebook conectado
    const facebookAccount = await this.socialAccountsService.getAccount(userId, 'facebook');
    
    if (!facebookAccount) {
      throw new NotFoundException(
        'No tienes una cuenta de Facebook conectada. Por favor, conéctala primero.'
      );
    }

    const userAccessToken = facebookAccount.accessToken;

    try {
      // 2. Obtener las páginas del usuario usando /me/accounts
      // Este endpoint funciona con el token de usuario básico si eres admin de páginas
      console.log('📄 Obteniendo páginas del usuario...');
      const pagesResponse = await firstValueFrom(
        this.httpService.get(
          `${this.FACEBOOK_GRAPH_API}/me/accounts?access_token=${userAccessToken}`
        )
      );

      console.log('📄 Respuesta de páginas:', pagesResponse.data);

      const pages = pagesResponse.data.data;
      
      if (!pages || pages.length === 0) {
        throw new BadRequestException(
          'No se encontraron páginas. Asegúrate de:\n' +
          '1. Haber creado una página en Facebook\n' +
          '2. Ser administrador de la página\n' +
          '3. La app debe estar en modo desarrollo (no requiere permisos especiales)'
        );
      }

      // 3. Usar la primera página disponible
      const page = pages[0];
      const pageAccessToken = page.access_token;
      const pageId = page.id;
      
      console.log(`📄 Publicando en la página: ${page.name} (${pageId})`);

      // 4. Preparar los datos para publicar
      const postData: any = {
        message: postDto.message,
        access_token: pageAccessToken, // Token de la página
      };

      // Agregar link si existe
      if (postDto.link) {
        postData.link = postDto.link;
      }

      // 5. Publicar en la página
      const response = await firstValueFrom(
        this.httpService.post(
          `${this.FACEBOOK_GRAPH_API}/${pageId}/feed`,
          postData
        )
      );

      return {
        success: true,
        message: `Publicación creada exitosamente en la página "${page.name}"`,
        postId: response.data.id,
        pageName: page.name,
        pageId: pageId,
        data: response.data,
      };
    } catch (error) {
      console.error('❌ Error completo:', error);
      console.error('Error al publicar en Facebook:', error.response?.data || error.message);
      
      // Manejar errores específicos de Facebook
      if (error.response?.data?.error) {
        const fbError = error.response.data.error;
        
        // Error específico de permisos
        if (fbError.code === 200 || fbError.code === 190) {
          throw new BadRequestException(
            'Tu app de Facebook está en modo desarrollo. ' +
            'Para publicar en páginas, necesitas:\n' +
            '1. Crear una página de Facebook\n' +
            '2. Ser administrador de esa página\n' +
            '3. El endpoint /me/accounts debería devolver tus páginas automáticamente'
          );
        }
        
        throw new BadRequestException(
          `Error de Facebook: ${fbError.message} (Code: ${fbError.code})`
        );
      }

      throw new BadRequestException(
        'No se pudo publicar en Facebook. Error: ' + error.message
      );
    }
  }

  /**
   * Obtener información de la cuenta de Facebook conectada
   */
  async getFacebookAccountInfo(userId: number) {
    const facebookAccount = await this.socialAccountsService.getAccount(userId, 'facebook');
    
    if (!facebookAccount) {
      throw new NotFoundException('No tienes una cuenta de Facebook conectada');
    }

    try {
      // Obtener información básica del perfil de Facebook
      const response = await firstValueFrom(
        this.httpService.get(
          `${this.FACEBOOK_GRAPH_API}/me?fields=id,name,email&access_token=${facebookAccount.accessToken}`
        )
      );

      return {
        connected: true,
        provider: 'facebook',
        profile: response.data,
        connectedAt: facebookAccount.createdAt,
      };
    } catch (error) {
      console.error('Error al obtener info de Facebook:', error.response?.data || error.message);
      throw new BadRequestException('No se pudo obtener la información de Facebook');
    }
  }

  /**
   * Publicar en una página de Facebook (requiere permisos adicionales)
   */
  async publishToFacebookPage(
    userId: number, 
    pageId: string, 
    postDto: CreateFacebookPostDto
  ) {
    // Esta funcionalidad requiere:
    // 1. Permisos de pages_manage_posts
    // 2. Obtener el Page Access Token
    // Por ahora, lo dejamos como placeholder para futuras implementaciones
    
    throw new BadRequestException(
      'Publicar en páginas de Facebook requiere configuración adicional de permisos'
    );
  }
  /**
   * Publicar video en TikTok
   */
  /**
   * Publicar video en TikTok
   */
  async publishToTikTok(userId: number, videoPath: string, caption: string) {
    // 1. Obtener cuenta de TikTok del usuario
    const tiktokAccount = await this.socialAccountsService.getAccount(userId, 'tiktok');

    if (!tiktokAccount) {
      throw new NotFoundException('No tienes TikTok conectado');
    }

    const accessToken = tiktokAccount.accessToken;

    try {
      const fs = require('fs');
      const axios = require('axios');
      
      const videoBuffer = fs.readFileSync(videoPath);
      const videoSize = videoBuffer.length;
      
      // 2. Inicializar upload
      console.log('📤 Iniciando upload a TikTok...');
      console.log('📦 Tamaño del video:', videoSize, 'bytes');
      
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
      console.log('✅ Upload inicializado - publish_id:', publish_id);
      console.log('📍 Upload URL:', upload_url);

      // 3. Subir el video usando axios directamente
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
}
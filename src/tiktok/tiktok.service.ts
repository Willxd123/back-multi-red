import {
  Injectable,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SocialAccountsService } from '../social_accounts/social_accounts.service';

// Map temporal para conexiones pendientes
const pendingConnections = new Map<string, number>();

interface TiktokUser {
  tiktokId: string;
  username: string;
  displayName: string;
  accessToken: string;
  refreshToken: string;
}

@Injectable()
export class TiktokService {
  constructor(
    private readonly socialAccountsService: SocialAccountsService,
    private readonly configService: ConfigService,
  ) {}

  // ========== CONEXIÓN CON TIKTOK ==========

  /**
   * Generar URL de autenticación de TikTok
   */
  getAuthUrl(): string {
    const clientKey = this.configService.get<string>('TIKTOK_CLIENT_KEY');
    const redirectUri = encodeURIComponent(
      this.configService.get<string>('TIKTOK_CALLBACK_URL'),
    );
    const csrfState = Math.random().toString(36).substring(2);

    return (
      `https://www.tiktok.com/v2/auth/authorize/` +
      `?client_key=${clientKey}` +
      `&scope=user.info.basic,video.publish,video.upload` +
      `&response_type=code` +
      `&redirect_uri=${redirectUri}` +
      `&state=${csrfState}`
    );
  }

  /**
   * Generar URL de conexión (para usuarios ya autenticados)
   */
  generateConnectionUrl(userId: number): string {
    const token = `${Date.now()}_${Math.random().toString(36).substring(7)}`;

    console.log(`🔗 Iniciando conexión TikTok - Usuario: ${userId}, Token: ${token}`);

    // Guardar temporalmente
    pendingConnections.set(token, userId);

    // Expirar en 10 minutos
    setTimeout(() => {
      pendingConnections.delete(token);
      console.log(`🗑️ Token expirado: ${token}`);
    }, 10 * 60 * 1000);

    const clientKey = this.configService.get<string>('TIKTOK_CLIENT_KEY');
    const redirectUri = encodeURIComponent(
      this.configService.get<string>('TIKTOK_CALLBACK_URL'),
    );

    return (
      `https://www.tiktok.com/v2/auth/authorize/` +
      `?client_key=${clientKey}` +
      `&scope=user.info.basic,video.publish,video.upload` +
      `&response_type=code` +
      `&redirect_uri=${redirectUri}` +
      `&state=${token}`
    );
  }

  /**
   * Manejar callback de TikTok (solo conexión)
   */
  async handleCallback(code: string, state: string): Promise<void> {
    if (!code) {
      throw new BadRequestException('No se recibió código de TikTok');
    }

    console.log('📥 TikTok Callback - Code:', code);
    console.log('📥 TikTok Callback - State:', state);

    // Verificar que sea una conexión válida
    if (!state || !pendingConnections.has(state)) {
      throw new BadRequestException('Sesión inválida o expirada');
    }

    const userId = pendingConnections.get(state);
    pendingConnections.delete(state);

    console.log('🔗 Conectando TikTok al usuario:', userId);

    // Intercambiar code por access token
    const tokenData = await this.exchangeCodeForToken(code);

    // Obtener información del usuario
    const userData = await this.getUserInfo(tokenData.access_token);

    const tiktokUser: TiktokUser = {
      tiktokId: userData.data.user.open_id,
      username: userData.data.user.display_name,
      displayName: userData.data.user.display_name,
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token,
    };

    // Guardar conexión
    await this.connectToUser(userId, tiktokUser);

    console.log('✅ TikTok conectado exitosamente');
  }

  /**
   * Intercambiar código por access token
   */
  private async exchangeCodeForToken(code: string): Promise<any> {
    const response = await fetch('https://open.tiktokapis.com/v2/oauth/token/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_key: this.configService.get<string>('TIKTOK_CLIENT_KEY'),
        client_secret: this.configService.get<string>('TIKTOK_CLIENT_SECRET'),
        code: code,
        grant_type: 'authorization_code',
        redirect_uri: this.configService.get<string>('TIKTOK_CALLBACK_URL'),
      }),
    });

    const data = await response.json();
    console.log('🔑 Token de TikTok:', data);

    if (!data.access_token) {
      console.error('❌ Error de TikTok:', data);
      throw new BadRequestException('No se pudo obtener access token de TikTok');
    }

    return data;
  }

  /**
   * Obtener información del usuario de TikTok
   */
  private async getUserInfo(accessToken: string): Promise<any> {
    const response = await fetch(
      'https://open.tiktokapis.com/v2/user/info/?fields=open_id,union_id,avatar_url,display_name',
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );

    const data = await response.json();
    console.log('👤 Usuario de TikTok:', data);

    return data;
  }

  /**
   * Conectar TikTok a usuario existente
   */
  private async connectToUser(userId: number, tiktokUser: TiktokUser): Promise<void> {
    await this.socialAccountsService.upsertAccount(
      userId,
      'tiktok',
      tiktokUser.tiktokId,
      tiktokUser.accessToken,
      null, // expiresAt
      tiktokUser.refreshToken,
      tiktokUser.username,
    );
  }

  // ========== UTILIDADES ==========

  /**
   * Verificar si TikTok está conectado
   */
  async isConnected(userId: number): Promise<boolean> {
    return this.socialAccountsService.hasAccount(userId, 'tiktok');
  }


}
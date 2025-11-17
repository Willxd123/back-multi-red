import { FacebookAuthGuard } from './guard/facebook-auth.guard';
import { FacebookConnectGuard } from './guard/facebook-connect.guard';
import { AuthGuard } from './guard/auth.guard';
import {
  Controller,
  Post,
  Body,
  Get,
  Req,
  UseGuards,
  Res,
  UnauthorizedException,
  Query,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LogingDto } from './dto/login.dto';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Auth } from './decorators/auth.decorator';
import { ActiveUser } from 'src/common/decorators/active-user.decorator';
import { UserActiveInterface } from 'src/common/interfaces/user-active.interface';
import { Role } from 'src/common/enums/rol.enum';
import { GoogleAuthGuard } from './guard/google-auth.guard';
import { JwtService } from '@nestjs/jwt';
import { Response } from 'express';

// Map temporal para vincular conexiones pendientes
const pendingConnections = new Map<string, number>();

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly jwtService: JwtService,
  ) {}

  @Post('register')
  register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Post('login')
  login(@Body() loginDto: LogingDto) {
    return this.authService.login(loginDto);
  }

  // ========== GOOGLE LOGIN ==========
  @Get('google')
  @UseGuards(GoogleAuthGuard)
  async googleAuth(@Req() req) {}

  @Get('google/callback')
  @UseGuards(GoogleAuthGuard)
  async googleAuthRedirect(@Req() req, @Res() res) {
    try {
      const { token, user } = await this.authService.googleLogin(req.user);
      const origin = req.headers.origin || 'http://localhost:4200';
      res.redirect(`${origin}/?token=${token}`);
    } catch (error) {
      console.error('Error en la autenticación con Google:', error);
      res.status(500).json({ message: 'Error en la autenticación con Google' });
    }
  }

  // ========== FACEBOOK LOGIN (para autenticación) ==========
  @Get('facebook')
  @UseGuards(FacebookAuthGuard)
  async facebookAuth() {}

  @Get('facebook/callback')
  async facebookCallback(@Req() req, @Res() res: Response, @Query('token') token: string, @Query('code') code: string) {
    try {
      console.log('📥 Facebook Callback');
      console.log('   Token query:', token);
      console.log('   Code query:', code);
      
      // Facebook siempre devuelve un 'code' que debemos intercambiar por un access token
      if (!code) {
        throw new Error('No se recibió código de Facebook');
      }
      
      // Construir la redirect_uri EXACTA que usamos en el OAuth dialog
      // Debe incluir el ?token= si existe
      let redirectUri = 'http://localhost:3000/api/auth/facebook/callback';
      if (token) {
        redirectUri += `?token=${token}`;
      }
      
      console.log('🔄 Intercambiando code por access_token');
      console.log('   redirect_uri:', redirectUri);
      
      // Intercambiar el code por un access token manualmente
      const tokenResponse = await fetch(
        `https://graph.facebook.com/v18.0/oauth/access_token?` +
        `client_id=${process.env.FACEBOOK_APP_ID}` +
        `&client_secret=${process.env.FACEBOOK_APP_SECRET}` +
        `&redirect_uri=${encodeURIComponent(redirectUri)}` +
        `&code=${code}`
      );
      
      const tokenData = await tokenResponse.json();
      console.log('🔑 Token de Facebook:', tokenData);
      
      if (!tokenData.access_token) {
        console.error('❌ Error de Facebook:', tokenData);
        throw new Error('No se pudo obtener access token de Facebook');
      }
      
      // Obtener datos del perfil de Facebook
      const profileResponse = await fetch(
        `https://graph.facebook.com/v18.0/me?fields=id,name,email&access_token=${tokenData.access_token}`
      );
      
      const profile = await profileResponse.json();
      console.log('👤 Perfil de Facebook:', profile);
      
      // Construir objeto user como lo haría Passport
      const facebookUser = {
        facebookId: profile.id,
        name: profile.name,
        email: profile.email || null,
        facebookAccessToken: tokenData.access_token,
      };
      
      // DISTINGUIR: ¿Es login o conexión?
      if (token) {
        // FLUJO DE CONEXIÓN
        return this.handleFacebookConnect(facebookUser, res, token);
      } else {
        // FLUJO DE LOGIN
        return this.handleFacebookLogin(facebookUser, res);
      }
    } catch (error) {
      console.error('❌ Error en Facebook callback:', error);
      res.redirect(`http://localhost:4200/?error=facebook`);
    }
  }

  // Helper: Manejar login con Facebook
  private async handleFacebookLogin(facebookUser: any, res: Response) {
    try {
      const { token, user } = await this.authService.facebookLogin(facebookUser);
      res.redirect(`http://localhost:4200/?token=${token}`);
    } catch (error) {
      console.error('Error en login:', error);
      res.redirect(`http://localhost:4200/?error=facebook_login`);
    }
  }

  // Helper: Manejar conexión de Facebook
  private async handleFacebookConnect(facebookUser: any, res: Response, token: string) {
    try {
      console.log(`📥 Conectando con token: ${token}`);
      
      // Recuperar userId
      const userId = pendingConnections.get(token);
      
      if (!userId) {
        console.error('❌ Token no encontrado');
        return res.redirect(`http://localhost:4200/client?error=session_expired`);
      }
      
      // Limpiar token
      pendingConnections.delete(token);
      
      console.log(`✅ Conectando Facebook al usuario ${userId}`);
      
      // Conectar Facebook
      await this.authService.connectFacebook(userId, facebookUser);

      res.redirect(`http://localhost:4200/client?connected=facebook`);
    } catch (error) {
      console.error('❌ Error:', error);
      res.redirect(`http://localhost:4200/client?error=facebook_connect`);
    }
  }

  // ========== CONECTAR FACEBOOK ⬅️ SOLUCIÓN FINAL ==========
  
  /**
   * Paso 1: Frontend llama a este endpoint con JWT
   * Devuelve una URL que el frontend debe abrir
   */
  @ApiBearerAuth()
  @Post('connect/facebook/start')
  @UseGuards(AuthGuard)
  async startFacebookConnection(@ActiveUser() user: UserActiveInterface) {
    // Generar token temporal único
    const connectionToken = `${Date.now()}_${Math.random().toString(36).substring(7)}`;
    
    // Guardar userId (expira en 10 minutos)
    pendingConnections.set(connectionToken, user.id);
    setTimeout(() => {
      pendingConnections.delete(connectionToken);
      console.log(`🗑️ Token expirado: ${connectionToken}`);
    }, 10 * 60 * 1000);
    
    console.log(`🔗 Conexión iniciada - Usuario: ${user.id}, Token: ${connectionToken}`);
    
    // Devolver la URL que el frontend debe abrir
    return {
      url: `http://localhost:3000/api/auth/connect/facebook/init?token=${connectionToken}`,
      message: 'Redirige a esta URL para conectar Facebook',
    };
  }

  /**
   * Paso 2: El frontend abre esta URL que inicia OAuth
   */
  @Get('connect/facebook/init')
  async connectFacebookInit(@Query('token') token: string, @Req() req, @Res() res: Response) {
    // Verificar que el token existe
    if (!pendingConnections.has(token)) {
      const origin = req.headers?.origin || 'http://localhost:4200';
      return res.redirect(`${origin}/client?error=invalid_token`);
    }
    
    console.log(`✅ Iniciando OAuth para token: ${token}`);
    
    // Construir URL de Facebook OAuth manualmente con el token
    // SOLO permisos básicos disponibles sin revisión
    const facebookAuthUrl = `https://www.facebook.com/v18.0/dialog/oauth?` +
      `client_id=${process.env.FACEBOOK_APP_ID}` +
      `&redirect_uri=${encodeURIComponent(`http://localhost:3000/api/auth/facebook/callback?token=${token}`)}` +
      `&scope=public_profile,email`;
    
    res.redirect(facebookAuthUrl);
  }
// ========== TIKTOK OAUTH (sin Passport) ==========
  
  /**
   * Paso 1: Iniciar OAuth con TikTok
   */
  @Get('tiktok')
  async tiktokAuth(@Res() res: Response) {
    const clientKey = process.env.TIKTOK_CLIENT_KEY;
    const redirectUri = encodeURIComponent(process.env.TIKTOK_CALLBACK_URL);
    const csrfState = Math.random().toString(36).substring(2);
    
    // Construir URL de autorización de TikTok
    const tiktokAuthUrl = 
      `https://www.tiktok.com/v2/auth/authorize/` +
      `?client_key=${clientKey}` +
      `&scope=user.info.basic,video.publish,video.upload` +
      `&response_type=code` +
      `&redirect_uri=${redirectUri}` +
      `&state=${csrfState}`;
    
    res.redirect(tiktokAuthUrl);
  }

  /**
   * Paso 2: Callback de TikTok
   */
  @Get('tiktok/callback')
  async tiktokCallback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Res() res: Response,
  ) {
    try {
      if (!code) {
        throw new Error('No se recibió código de TikTok');
      }

      console.log('📥 TikTok Callback - Code:', code);
      console.log('📥 TikTok Callback - State:', state);

      // Intercambiar code por access token
      const tokenResponse = await fetch('https://open.tiktokapis.com/v2/oauth/token/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_key: process.env.TIKTOK_CLIENT_KEY,
          client_secret: process.env.TIKTOK_CLIENT_SECRET,
          code: code,
          grant_type: 'authorization_code',
          redirect_uri: process.env.TIKTOK_CALLBACK_URL,
        }),
      });

      const tokenData = await tokenResponse.json();
      console.log('🔑 Token de TikTok:', tokenData);

      if (!tokenData.access_token) {
        console.error('❌ Error de TikTok:', tokenData);
        throw new Error('No se pudo obtener access token de TikTok');
      }

      // Obtener información del usuario
      const userResponse = await fetch('https://open.tiktokapis.com/v2/user/info/?fields=open_id,union_id,avatar_url,display_name', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${tokenData.access_token}`,
        },
      });

      const userData = await userResponse.json();
      console.log('👤 Usuario de TikTok:', userData);

      const tiktokUser = {
        tiktokId: userData.data.user.open_id,
        username: userData.data.user.display_name,
        displayName: userData.data.user.display_name,
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token,
      };

      // Verificar si es CONEXIÓN o LOGIN
      if (state && pendingConnections.has(state)) {
        // FLUJO DE CONEXIÓN (viene desde /connect/tiktok/start)
        console.log('🔗 Flujo de CONEXIÓN detectado');
        
        const userId = pendingConnections.get(state);
        pendingConnections.delete(state);
        
        await this.authService.connectTikTok(userId, tiktokUser);
        
        res.redirect(`http://localhost:4200/client?connected=tiktok`);
      } else {
        // FLUJO DE LOGIN (viene desde /tiktok)
        console.log('🔐 Flujo de LOGIN detectado');
        
        const { token, user } = await this.authService.tiktokLogin(tiktokUser);
        
        res.redirect(`http://localhost:4200/?token=${token}`);
      }
    } catch (error) {
      console.error('❌ Error en TikTok callback:', error);
      res.redirect(`http://localhost:4200/?error=tiktok`);
    }
  }
  /**
   * Conectar TikTok a cuenta existente
   */
  @Post('connect/tiktok/start')
  @UseGuards(AuthGuard)
  async connectTikTokStart(@ActiveUser() user: UserActiveInterface) {
    const userId = user.id;
    const token = `${Date.now()}_${Math.random().toString(36).substring(7)}`;
    
    // Guardar temporalmente
    pendingConnections.set(token, userId);
    
    // Expirar en 10 minutos
    setTimeout(() => pendingConnections.delete(token), 10 * 60 * 1000);
    
    const clientKey = process.env.TIKTOK_CLIENT_KEY;
    const redirectUri = encodeURIComponent(process.env.TIKTOK_CALLBACK_URL); // ⬅️ SIN ?token
    
    const url = 
      `https://www.tiktok.com/v2/auth/authorize/` +
      `?client_key=${clientKey}` +
      `&scope=user.info.basic,video.publish,video.upload` +
      `&response_type=code` +
      `&redirect_uri=${redirectUri}` +
      `&state=${token}`; // ⬅️ El token va en state, no en redirect_uri
    
    return { url };
  }
  // ========== PERFIL ==========
  @ApiBearerAuth()
  @Get('profile')
  @Auth(Role.USER)
  profile(@ActiveUser() user: UserActiveInterface) {
    return this.authService.profile(user);
  }
}
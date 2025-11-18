import {
  Controller,
  Get,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Response } from 'express';
import { TiktokService } from './tiktok.service';
import { AuthGuard } from '../auth/guard/auth.guard';
import { ActiveUser } from '../common/decorators/active-user.decorator';
import { UserActiveInterface } from '../common/interfaces/user-active.interface';
import { ApiBearerAuth, ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('tiktok')
@Controller('tiktok')
export class TiktokController {
  constructor(private readonly tiktokService: TiktokService) {}

  // ========== CONEXIÓN DE TIKTOK ==========

  /**
   * Iniciar OAuth con TikTok (solo para conectar cuenta existente)
   */
  @Get('auth')
  @ApiOperation({ summary: 'Iniciar conexión con TikTok' })
  async initiateAuth(@Res() res: Response) {
    const authUrl = this.tiktokService.getAuthUrl();
    res.redirect(authUrl);
  }

  /**
   * Callback de TikTok OAuth
   */
  @Get('callback')
  @ApiOperation({ summary: 'Callback de TikTok OAuth' })
  async handleCallback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Res() res: Response,
  ) {
    try {
      await this.tiktokService.handleCallback(code, state);
      
      // Siempre redirige al cliente (solo hay flujo de conexión)
      res.redirect(`http://localhost:4200/client?connected=tiktok`);
    } catch (error) {
      console.error('❌ Error en TikTok callback:', error);
      res.redirect(`http://localhost:4200/client?error=tiktok`);
    }
  }

  /**
   * Conectar TikTok a cuenta existente (genera URL)
   */
  @Post('connect')
  @ApiBearerAuth()
  @UseGuards(AuthGuard)
  @ApiOperation({ summary: 'Generar URL para conectar TikTok' })
  @ApiResponse({ status: 200, description: 'URL de conexión generada' })
  async startConnection(@ActiveUser() user: UserActiveInterface) {
    const url = this.tiktokService.generateConnectionUrl(user.id);
    return { url };
  }

  /**
   * Verificar si TikTok está conectado
   */
  @Get('status')
  @ApiBearerAuth()
  @UseGuards(AuthGuard)
  @ApiOperation({ summary: 'Verificar si TikTok está conectado' })
  async getConnectionStatus(@ActiveUser() user: UserActiveInterface) {
    const isConnected = await this.tiktokService.isConnected(user.id);
    return { connected: isConnected };
  }


}
import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import * as path from 'path';
import * as fs from 'fs';
import { WhatsappService } from './whatsapp.service';
import { AuthGuard } from '../auth/guard/auth.guard';
import { ActiveUser } from '../common/decorators/active-user.decorator';
import { UserActiveInterface } from '../common/interfaces/user-active.interface';
import { ApiBearerAuth, ApiTags, ApiOperation, ApiResponse, ApiConsumes } from '@nestjs/swagger';

@ApiTags('whatsapp')
@ApiBearerAuth()
@Controller('whatsapp')
@UseGuards(AuthGuard)
export class WhatsappController {
  constructor(private readonly whatsappService: WhatsappService) {}

  /**
   * Verificar conexión de WhatsApp
   */
  @Get('status')
  @ApiOperation({ summary: 'Verificar estado de conexión de WhatsApp' })
  @ApiResponse({ status: 200, description: 'Estado de conexión obtenido' })
  async checkConnection(@ActiveUser() user: UserActiveInterface) {
    return this.whatsappService.checkConnection();
  }

  /**
   * Publicar imagen en Estado de WhatsApp
   */
  @Post('status')
  @ApiOperation({ summary: 'Publicar imagen en Estado de WhatsApp' })
  @ApiResponse({ status: 200, description: 'Estado publicado exitosamente' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileInterceptor('photo', {
      storage: diskStorage({
        destination: './uploads/images',
        filename: (req, file, cb) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
          const ext = path.extname(file.originalname);
          cb(null, `whatsapp-${uniqueSuffix}${ext}`);
        },
      }),
      fileFilter: (req, file, cb) => {
        // Solo imágenes
        if (file.mimetype.match(/\/(jpg|jpeg|png)$/)) {
          cb(null, true);
        } else {
          cb(new Error('Solo se permiten archivos JPG o PNG'), false);
        }
      },
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB máximo
      },
    })
  )
  async publishStatus(
    @ActiveUser() user: UserActiveInterface,
    @UploadedFile() photo: Express.Multer.File,
    @Body('caption') caption: string,
  ) {
    if (!photo) {
      throw new BadRequestException('Se requiere una imagen');
    }

    if (!caption) {
      throw new BadRequestException('Se requiere un caption/descripción');
    }

    try {
      const result = await this.whatsappService.publishStatus(
        user.id,
        photo.path,
        caption,
      );

      // Eliminar archivo temporal después de publicar
      fs.unlinkSync(photo.path);

      return result;
    } catch (error) {
      // Eliminar archivo en caso de error
      if (fs.existsSync(photo.path)) {
        fs.unlinkSync(photo.path);
      }
      throw error;
    }
  }
}
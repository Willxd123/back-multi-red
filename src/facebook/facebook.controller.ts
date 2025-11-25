import {
  Controller,
  Post,
  Body,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  Get,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import * as path from 'path';
import * as fs from 'fs';
import { FacebookService } from './facebook.service';
import { AuthGuard } from '../auth/guard/auth.guard';
import { ActiveUser } from '../common/decorators/active-user.decorator';
import { UserActiveInterface } from '../common/interfaces/user-active.interface';
import { ApiBearerAuth, ApiTags, ApiOperation, ApiResponse, ApiConsumes } from '@nestjs/swagger';

@ApiTags('facebook')
@ApiBearerAuth()
@Controller('facebook')
@UseGuards(AuthGuard)
export class FacebookController {
  constructor(private readonly facebookService: FacebookService) {}

  /**
   * Publicar foto en Facebook
   */
  @Post('photo')
  @UseGuards(AuthGuard)
  @ApiOperation({ summary: 'Publicar foto en página de Facebook' })
  @ApiResponse({ status: 200, description: 'Foto publicada exitosamente' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileInterceptor('photo', {
      storage: diskStorage({
        destination: './uploads/images',
        filename: (req, file, cb) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
          const ext = path.extname(file.originalname);
          cb(null, `facebook-${uniqueSuffix}${ext}`);
        },
      }),
      fileFilter: (req, file, cb) => {
        // Solo imágenes
        if (file.mimetype.match(/\/(jpg|jpeg|png|gif)$/)) {
          cb(null, true);
        } else {
          cb(new Error('Solo se permiten archivos de imagen (jpg, png, gif)'), false);
        }
      },
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB máximo
      },
    })
  )
  async publishPhoto(
    @ActiveUser() user: UserActiveInterface,
    @UploadedFile() photo: Express.Multer.File,
    @Body('message') message: string,
  ) {
    if (!photo) {
      throw new BadRequestException('Se requiere una imagen');
    }

    if (!message) {
      throw new BadRequestException('Se requiere un mensaje');
    }

    try {
      const result = await this.facebookService.publishPhoto(
        user.id,
        photo.path,
        message,
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
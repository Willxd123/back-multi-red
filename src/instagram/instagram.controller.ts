import {
  Controller,
  Post,
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
import { InstagramService } from './instagram.service';
import { AuthGuard } from '../auth/guard/auth.guard';
import { ActiveUser } from '../common/decorators/active-user.decorator';
import { UserActiveInterface } from '../common/interfaces/user-active.interface';
import { ApiBearerAuth, ApiTags, ApiOperation, ApiResponse, ApiConsumes } from '@nestjs/swagger';

@ApiTags('instagram')
@ApiBearerAuth()
@Controller('instagram')
@UseGuards(AuthGuard)
export class InstagramController {
  constructor(private readonly instagramService: InstagramService) {}

  /**
   * Verificar credenciales de Instagram
   */
  @Post('verify')
  @ApiOperation({ summary: 'Verificar credenciales de Instagram' })
  @ApiResponse({ status: 200, description: 'Credenciales verificadas' })
  async verifyCredentials(@ActiveUser() user: UserActiveInterface) {
    return this.instagramService.verifyCredentials();
  }

  /**
   * Publicar foto en Instagram
   */
  @Post('photo')
  @ApiOperation({ summary: 'Publicar foto en Instagram' })
  @ApiResponse({ status: 200, description: 'Foto publicada exitosamente' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileInterceptor('photo', {
      storage: diskStorage({
        destination: './uploads/images',
        filename: (req, file, cb) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
          const ext = path.extname(file.originalname);
          cb(null, `instagram-${uniqueSuffix}${ext}`);
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
        fileSize: 8 * 1024 * 1024, // 8MB máximo (límite de Instagram)
      },
    })
  )
  async publishPhoto(
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
      const result = await this.instagramService.publishPhoto(
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
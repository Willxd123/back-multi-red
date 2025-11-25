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
import { LinkedinService } from './linkedin.service';
import { AuthGuard } from '../auth/guard/auth.guard';
import { ActiveUser } from '../common/decorators/active-user.decorator';
import { UserActiveInterface } from '../common/interfaces/user-active.interface';
import { ApiBearerAuth, ApiTags, ApiOperation, ApiResponse, ApiConsumes } from '@nestjs/swagger';

@ApiTags('linkedin')
@ApiBearerAuth()
@Controller('linkedin')
@UseGuards(AuthGuard)
export class LinkedinController {
  constructor(private readonly linkedinService: LinkedinService) {}

  /**
   * Publicar imagen en LinkedIn
   */
  @Post('post')
  @ApiOperation({ summary: 'Publicar imagen en LinkedIn vía Make.com' })
  @ApiResponse({ status: 200, description: 'Publicación enviada exitosamente' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileInterceptor('photo', {
      storage: diskStorage({
        destination: './uploads/images',
        filename: (req, file, cb) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
          const ext = path.extname(file.originalname);
          cb(null, `linkedin-${uniqueSuffix}${ext}`);
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
  async publishPost(
    @ActiveUser() user: UserActiveInterface,
    @UploadedFile() photo: Express.Multer.File,
    @Body('description') description: string,
  ) {
    if (!photo) {
      throw new BadRequestException('Se requiere una imagen');
    }

    if (!description) {
      throw new BadRequestException('Se requiere una descripción');
    }

    try {
      const result = await this.linkedinService.publishPost(
        user.id,
        photo.path,
        description,
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
import { Injectable, NotFoundException, StreamableFile } from '@nestjs/common';
import { createReadStream, existsSync } from 'fs';
import { join } from 'path';
import { stat } from 'fs/promises';

@Injectable()
export class MediaService {
  // Directorio donde están los archivos generados
  private readonly outputsPath = join(process.cwd(), 'outputs');

  /**
   * Obtiene un archivo (imagen o video) del directorio outputs
   */
  async getFile(filename: string): Promise<{ stream: StreamableFile; mimeType: string; size: number }> {
    // Validar que el filename no contenga caracteres peligrosos
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      throw new NotFoundException('Nombre de archivo inválido');
    }

    const filePath = join(this.outputsPath, filename);

    // Verificar que el archivo existe
    if (!existsSync(filePath)) {
      throw new NotFoundException(`Archivo no encontrado: ${filename}`);
    }

    // Obtener información del archivo
    const fileStats = await stat(filePath);
    const fileSize = fileStats.size;

    // Determinar tipo MIME basado en la extensión
    const mimeType = this.getMimeType(filename);

    // Crear stream del archivo
    const file = createReadStream(filePath);

    return {
      stream: new StreamableFile(file),
      mimeType,
      size: fileSize,
    };
  }

  /**
   * Determina el tipo MIME según la extensión del archivo
   */
  private getMimeType(filename: string): string {
    const extension = filename.split('.').pop()?.toLowerCase();

    switch (extension) {
      // Imágenes
      case 'jpg':
      case 'jpeg':
        return 'image/jpeg';
      case 'png':
        return 'image/png';
      case 'gif':
        return 'image/gif';
      case 'webp':
        return 'image/webp';

      // Videos
      case 'mp4':
        return 'video/mp4';
      case 'mov':
        return 'video/quicktime';
      case 'avi':
        return 'video/x-msvideo';

      default:
        return 'application/octet-stream';
    }
  }
}
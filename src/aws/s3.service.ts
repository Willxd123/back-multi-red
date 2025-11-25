import { Injectable } from '@nestjs/common';
import * as AWS from 'aws-sdk';

@Injectable()
export class S3Service {
  private s3: AWS.S3;

  constructor() {
    if (!process.env.AWS_S3_BUCKET_NAME) {
      throw new Error(
        'AWS_S3_BUCKET_NAME no está configurado en las variables de entorno',
      );
    }

    this.s3 = new AWS.S3({
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      region: process.env.AWS_REGION || 'us-east-1',
    });
  }

  /**
   * Convierte una imagen de S3 a base64 para usar en PDFs
   */
  async getImageAsBase64(imageUrl: string): Promise<string> {
    try {
      // Extraer bucket y key de la URL
      const bucket = process.env.AWS_S3_BUCKET_NAME;
      const urlParts = imageUrl.replace('https://', '').split('/');
      const key = urlParts.slice(1).join('/');

      const params = {
        Bucket: bucket,
        Key: key,
      };

      const data = await this.s3.getObject(params).promise();
      const base64 = data.Body.toString('base64');

      // Determinar el tipo de imagen basado en la extensión
      const imageType = this.getImageType(imageUrl);

      return `data:image/${imageType};base64,${base64}`;
    } catch (error) {
      console.error('Error al obtener imagen de S3:', error);
      // Retornar una imagen placeholder en caso de error
      return this.getPlaceholderImage();
    }
  }

  /**
   * Obtiene el tipo de imagen basado en la URL
   */
  private getImageType(url: string): string {
    const extension = url.split('.').pop()?.toLowerCase();
    switch (extension) {
      case 'jpg':
      case 'jpeg':
        return 'jpeg';
      case 'png':
        return 'png';
      case 'gif':
        return 'gif';
      default:
        return 'jpeg';
    }
  }

  /**
   * Retorna una imagen placeholder en caso de error
   */
  private getPlaceholderImage(): string {
    // Imagen placeholder muy pequeña en base64 (1x1 pixel transparente)
    return 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
  }

  /**
   * Verifica si una URL es válida para S3
   */
  isValidS3Url(url: string): boolean {
    return url && (url.includes('.s3.') || url.includes('s3.amazonaws.com'));
  }
  /**
   * Sube una imagen para un diagnóstico
   */
  async uploadDiagnosticoImage(
    imageBuffer: Buffer,
    diagnosticoId: number,
    imageIndex: number,
    mimeType: string = 'image/jpeg',
  ): Promise<string> {
    try {
      const fecha = new Date();
      const year = fecha.getFullYear();
      const month = String(fecha.getMonth() + 1).padStart(2, '0');
      const day = String(fecha.getDate()).padStart(2, '0');

      // Extensión basada en mimeType
      const extension = this.getExtensionFromMimeType(mimeType);

      // Estructura: diagnosticos/2025/06/21/diag_123_img_001.jpg
      const key = `diagnosticos/${year}/${month}/${day}/diag_${diagnosticoId}_img_${String(imageIndex).padStart(3, '0')}.${extension}`;

      const params = {
        Bucket: process.env.AWS_S3_BUCKET_NAME!,
        Key: key,
        Body: imageBuffer,
        ContentType: mimeType,
        ACL: 'public-read' as any, 
      };

      const result = await this.s3.upload(params).promise();

      console.log(`✅ Imagen subida: ${result.Location}`);
      return result.Location;
    } catch (error) {
      console.error('❌ Error al subir imagen:', error);
      throw new Error('No se pudo subir la imagen a S3');
    }
  }

  /**
   * Obtiene extensión desde mimeType
   */
  private getExtensionFromMimeType(mimeType: string): string {
    switch (mimeType) {
      case 'image/jpeg':
        return 'jpg';
      case 'image/png':
        return 'png';
      case 'image/gif':
        return 'gif';
      case 'image/webp':
        return 'webp';
      default:
        return 'jpg';
    }
  }

  /**
   * Sube múltiples imágenes de un diagnóstico
   */
  async uploadMultipleDiagnosticoImages(
    images: { buffer: Buffer; mimeType: string }[],
    diagnosticoId: number,
  ): Promise<string[]> {
    const uploadPromises = images.map((image, index) =>
      this.uploadDiagnosticoImage(
        image.buffer,
        diagnosticoId,
        index + 1,
        image.mimeType,
      ),
    );

    return Promise.all(uploadPromises);
  }
   /**
   * Sube imagen para Instagram
   */
   async uploadInstagramImage(imageBuffer: Buffer): Promise<string> {
    try {
      const fecha = new Date();
      const year = fecha.getFullYear();
      const month = String(fecha.getMonth() + 1).padStart(2, '0');
      const day = String(fecha.getDate()).padStart(2, '0');
      const timestamp = Date.now();

      // Estructura: social-media/instagram/2025/01/15/img_1234567890.jpg
      const key = `social-media/instagram/${year}/${month}/${day}/img_${timestamp}.jpg`;

      const params = {
        Bucket: process.env.AWS_S3_BUCKET_NAME!,
        Key: key,
        Body: imageBuffer,
        ContentType: 'image/jpeg',
        ACL: 'public-read' as any,
      };

      const result = await this.s3.upload(params).promise();

      console.log(`✅ Imagen subida a S3 para Instagram: ${result.Location}`);
      return result.Location;
    } catch (error) {
      console.error('❌ Error al subir imagen a S3:', error);
      throw new Error('No se pudo subir la imagen a S3');
    }
  }
}

import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Service } from '../aws/s3.service';
import * as fs from 'fs';
import axios from 'axios';
import * as path from 'path';
@Injectable()
export class WhatsappService {
  private readonly whapiBaseUrl: string;
  private readonly whapiToken: string;
  // El ID del contacto destino (tu número) lo puedes sacar del .env o dejarlo fijo si es para pruebas
 // private readonly myContactId: string = "59161318710"; 
  private readonly myContactId: string = "59176316283";
  constructor(
    private readonly configService: ConfigService,
    private readonly s3Service: S3Service,
  ) {
    this.whapiBaseUrl = this.configService.get<string>('WHAPI_BASE_URL');
    this.whapiToken = this.configService.get<string>('WHAPI_TOKEN');

    if (!this.whapiBaseUrl || !this.whapiToken) {
      throw new Error('WHAPI_BASE_URL y WHAPI_TOKEN deben estar configurados en .env');
    }
  }

  /**
   * Publicar imagen en Estado de WhatsApp (Stories)
   * Usa S3 para el almacenamiento, pero el endpoint correcto de Stories
   */
  async publishStatus(userId: number, imagePath: string, caption: string) {
   

    if (!fs.existsSync(imagePath)) {
      throw new NotFoundException(`Archivo no encontrado: ${imagePath}`);
    }

    try {
      // 1. LEER BINARIO (Igual que 'archivo_binario' en Python)
      const imageBuffer = fs.readFileSync(imagePath);

      // (Opcional) Subir a S3 solo para tu respaldo en base de datos
      const s3Url = await this.s3Service.uploadWhatsAppImage(imageBuffer);
      console.log(`✅ Respaldo en S3 (Solo historial): ${s3Url}`);

      
      const fileName = path.basename(imagePath);
      const ext = path.extname(fileName).toLowerCase().replace('.', '');
    
      const mimeType = (ext === 'png') ? 'image/png' : 'image/jpeg';

   
      const b64String = imageBuffer.toString('base64');

    
      const mediaData = `data:${mimeType};name=${fileName};base64,${b64String}`;

      // 5. PAYLOAD IDÉNTICO AL PYTHON
      const payload = {
        media: mediaData,
        caption: caption,
        contacts: [this.myContactId] 
      };

      const urlEndpoint = `${this.whapiBaseUrl}/stories/send/media`;
      
      console.log(`🚀 Enviando a Whapi: ${urlEndpoint}`);

      const response = await axios.post(
        urlEndpoint,
        payload,
        {
          headers: {
            'Authorization': `Bearer ${this.whapiToken}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          timeout: 45000 // Mismo timeout que en Python
        }
      );

      console.log('✅ Éxito Whapi:', response.data);

      return {
        success: true,
        message: 'Estado publicado (Lógica Python replicada)',
        imageUrl: s3Url, 
        whapiResponse: response.data,
      };

    } catch (error) {
      console.error('❌ Error:', error.response?.data || error.message);
      if (error.response?.data) {
        throw new BadRequestException(`Whapi Error: ${JSON.stringify(error.response.data)}`);
      }
      throw new BadRequestException('Fallo publicación: ' + error.message);
    }
  }

  /**
   * Verificar conexión
   */
  async checkConnection() {
    try {
      // Usamos /users/me o /settings para verificar
      const response = await axios.get(
        `${this.whapiBaseUrl}/users/me`,
        {
          headers: { 'Authorization': `Bearer ${this.whapiToken}` },
          timeout: 10000,
        }
      );

      return { connected: true, data: response.data };
    } catch (error) {
      return { connected: false, error: error.message };
    }
  }
}
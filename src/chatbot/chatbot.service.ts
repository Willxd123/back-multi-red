import { Conversation } from './../conversation/entities/conversation.entity';
import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import OpenAI from 'openai';
import { RedesInputDto } from './dto/content.dto';
import { redesSystemPrompt2 } from './promp';
import { Message } from './entities/message.entity';
import * as fs from 'fs/promises';
import * as path from 'path';
@Injectable()
export class ChatbotService {
  private readonly logger = new Logger(ChatbotService.name);
  private openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
  constructor(
    @InjectRepository(Conversation)
    private readonly conversationRepository: Repository<Conversation>,
    @InjectRepository(Message)
    private readonly messageRepository: Repository<Message>,
  ) {}
  /**
   * Generar contenido para redes sociales con medios (video para TikTok, imágenes para el resto)
   */
  async generateSocialContent(data: RedesInputDto) {
    const { prompt, conversationId } = data;


    const conversation = await this.conversationRepository.findOne({
      where: { id: conversationId },
    });

    if (!conversation) {
      throw new NotFoundException(
        `Conversación ${conversationId} no encontrada`,
      );
    }

  
    const userMessage = this.messageRepository.create({
      role: 'user',
      content: { text: prompt },
      conversation: conversation,
    });
    await this.messageRepository.save(userMessage);


    const completion = await this.openai.chat.completions.create({
      model: 'gpt-4.1-mini', 
      messages: [
        { role: 'system', content: redesSystemPrompt2 },
        {
          role: 'user',
          content: `Genera JSON. Prompt: ${prompt}. Recuerda: responde solo JSON válido.`,
        },
      ],
      response_format: { type: 'json_object' },
    });

    const contenidoTexto = JSON.parse(completion.choices[0].message.content);

    // 4. Agregar estado de "procesando" al contenido
    const contentInicial = {
      ...contenidoTexto,
      status: 'processing_media', // Flag para el frontend
    };

    // 5. Guardar mensaje del ASISTENTE (sin medios aún)
    const assistantMessage = this.messageRepository.create({
      role: 'assistant',
      content: contentInicial,
      conversation: conversation,
    });
    const savedMessage = await this.messageRepository.save(assistantMessage);

    // 6. DISPARAR Y OLVIDAR (Fire and Forget): Iniciar generación de medios en background
    // No usamos 'await' aquí para liberar el controlador
    this.generateMediaInBackground(
      savedMessage.id,
      contenidoTexto,
      prompt,
    ).catch((err) =>
      this.logger.error(`Error en background task: ${err.message}`),
    );

    // 7. Retornar respuesta inmediata (JSON de texto)
    return savedMessage;
  }
 

  private async generateMediaInBackground(
    messageId: number,
    content: any,
    originalPrompt: string,
  ) {
    this.logger.log(`🔄 Iniciando generación de medios para Mensaje ID: ${messageId}`);
  
    try {
      // A. Limpiar campos innecesarios de TikTok (si existen)
      if (content.TikTok) {
        // Eliminar campos no deseados
        delete content.TikTok.character_count;
        delete content.TikTok.hashtags;
  
        const textoTikTok = content.TikTok.media_info?.descripcion || '';
  
        const videoInfo = await this.generarVideoInterno(
          this.crearPromptVideo(originalPrompt, textoTikTok)
        );
  
        // Actualizar media_info con rutas
        content.TikTok.media_info = {
          ...content.TikTok.media_info,
          ruta: videoInfo.filePath,
          fileName: videoInfo.fileName,
        };
      }
  
      // B. Limpiar campos innecesarios de otras redes (si aplica)
      const redesConImagen = ['Facebook', 'Instagram', 'LinkedIn', 'WhatsApp'];
      for (const red of redesConImagen) {
        if (content[red]) {
          delete content[red].character_count;
          delete content[red].hashtags;
  
          const imagePrompt = content[red].suggested_image_prompt || `${originalPrompt}, estilo profesional`;
          const imagenInfo = await this.generarImagenInterna(imagePrompt);
  
          content[red].media_info = {
            ...content[red].media_info,
            tipo: 'imagen',
            ruta: imagenInfo.filePath,
            fileName: imagenInfo.fileName,
          };
        }
      }
  
      // C. Actualizar mensaje con status "completed"
      await this.messageRepository.update(
        { id: messageId },
        {
          content: {
            ...content,
            status: 'completed',
          },
        }
      );
  
      this.logger.log(`✅ Medios generados y actualizados para Mensaje ID: ${messageId}`);
    } catch (err) {
      this.logger.error(`❌ Fallo generando medios mensaje ${messageId}: ${err.message}`);
      
      await this.messageRepository.update(
        { id: messageId },
        {
          content: {
            ...content,
            status: 'error',
            error: err.message,
          },
        }
      );
    }
  }
  
   //Generar video internamente (sin exponer endpoint)
   
  private async generarVideoInterno(promptVideo: string) {
    console.log('⏳ Iniciando generación de video...');
    let video = await this.openai.videos.create({
      model: 'sora-2',
      prompt: promptVideo,
      seconds: '4',
    });
    console.log('Trabajo de video creado:', video.id);
    // Polling del progreso
    let progress = video.progress ?? 0;
    while (video.status === 'in_progress' || video.status === 'queued') {
      video = await this.openai.videos.retrieve(video.id);
      progress = video.progress ?? 0;
      console.log(
        `${video.status === 'queued' ? 'En cola' : 'Procesando'}: ${progress.toFixed(1)}%`,
      );
      await new Promise((resolve) => setTimeout(resolve, 3000));
    }
    if (video.status === 'failed') {
      console.error('❌ Falló la generación del video');
      throw new Error(
        video.error?.message || 'Error desconocido al generar video',
      );
    }
    console.log('✓ Video completado, descargando...');
    const content = await this.openai.videos.downloadContent(video.id);
    const buffer = Buffer.from(await content.arrayBuffer());
    const outputDir = path.join(process.cwd(), 'outputs');
    try {
      await fs.mkdir(outputDir, { recursive: true });
    } catch {}
    const fileName = `video_${Date.now()}.mp4`;
    const filePath = path.join(outputDir, fileName);
    await fs.writeFile(filePath, buffer);
    console.log('✓ Video guardado:', fileName);
    return {
      videoId: video.id,
      fileName,
      filePath,
    };
  }
  
   //Generar imagen internamente (sin exponer endpoint)
   
  private async generarImagenInterna(promptImagen: string) {
    console.log('Generando imagen...');
    const result = await this.openai.images.generate({
      model: 'gpt-image-1',
      prompt: promptImagen,
      size: '1024x1024',
    });
    const imagenBase64 = result.data[0].b64_json;
    const outputDir = path.join(process.cwd(), 'outputs');
    try {
      await fs.mkdir(outputDir, { recursive: true });
    } catch {}
    const fileName = `imagen_${Date.now()}.png`;
    const filePath = path.join(outputDir, fileName);
    await fs.writeFile(filePath, Buffer.from(imagenBase64, 'base64'));
    console.log('✅ Imagen generada:', fileName);
    return {
      fileName,
      filePath,
    };
  }
  /**
   * Extraer hashtags de un texto
   */
  private extraerHashtags(text: string): string[] {
    if (!text) return [];
    const hashtagRegex = /#[\wÀ-ÿ]+/g;
    const hashtags = text.match(hashtagRegex);
    return hashtags || [];
  }
  
   //Crear un prompt descriptivo para el video basado en el contexto
   
  private crearPromptVideo(
    promptOriginal: string,
    textoTikTok: string,
  ): string {
    // Analizar el tono y contenido del mensaje
    const esTriste = /accident|fallec|muert|lament|pérdida|dolor/i.test(
      promptOriginal,
    );
    const esAlegre = /celebr|festej|logro|éxito|ganó|triunfo|graduación/i.test(
      promptOriginal,
    );
    const esInformativo = /anuncia|informa|convoca|invita/i.test(
      promptOriginal,
    );
    let estiloVisual = '';
    let tono = '';
    if (esTriste) {
      estiloVisual =
        'Ambiente serio y respetuoso, colores sobrios (grises, azules oscuros), personas mostrando solidaridad y apoyo, ambiente universitario';
      tono = 'emotivo y de apoyo comunitario';
    } else if (esAlegre) {
      estiloVisual =
        'Ambiente festivo y alegre, colores vibrantes, estudiantes celebrando, campus universitario lleno de vida';
      tono = 'energético y motivador';
    } else if (esInformativo) {
      estiloVisual =
        'Ambiente profesional universitario, estudiantes atentos, edificios de la universidad, tono institucional pero cercano';
      tono = 'informativo y accesible';
    } else {
      estiloVisual =
        'Campus universitario moderno, estudiantes diversos interactuando, ambiente dinámico y juvenil';
      tono = 'dinámico y juvenil';
    }
    return `Video corto de 4 segundos para redes sociales universitarias sobre: "${promptOriginal}".
    
Contexto: Universidad UAGRM (Universidad Autónoma Gabriel René Moreno) en Santa Cruz, Bolivia.
Mensaje del video: ${textoTikTok}
Estilo visual: ${estiloVisual}
Tono: ${tono}
Formato: Vertical 9:16 para TikTok/Instagram Reels
Duración: 4 segundos, directo y conciso
Importante: El video debe ser animado o con elementos visuales representativos, NO texto plano. Debe capturar la esencia emocional del mensaje de forma visual.`;
  }
}

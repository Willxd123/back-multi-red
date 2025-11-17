import { Injectable } from '@nestjs/common';
import OpenAI from 'openai';

import { RedesInputDto } from './dto/content.dto';

@Injectable()
export class ChatbotService {
  private openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });


  private redesSystemPrompt = `
  Eres un generador de contenido optimizado para redes sociales universitarias.
  
  Debes producir texto diferente por plataforma, manteniendo estilos:
  
  - Facebook: casual y cercano.
  - Instagram: visual y aspiracional; incluye suggested_image_prompt.
  - LinkedIn: profesional y corporativo.
  - TikTok: energético y juvenil.
  - WhatsApp: directo, corto y conversacional.
  
  REGLAS:
  - Responde exclusivamente sobre el contenido dado por el usuario.
  - No inventes datos adicionales.
  - Usa hashtags relevantes.
  - Incluye siempre "character_count".
  - Entrega SIEMPRE un JSON válido.
  `;
  async generateSocialContent(data: RedesInputDto) {
    const { titulo, contenido, target_networks } = data;
  
    const completion = await this.openai.chat.completions.create({
      model: "gpt-4.1-mini", 
      messages: [
        { role: "system", content: this.redesSystemPrompt },
        {
          role: "user",
          content: JSON.stringify({ titulo, contenido, target_networks })
        }
      ],
      response_format: { type: "json_object" }
    });
  
    return JSON.parse(completion.choices[0].message.content);
  }
}

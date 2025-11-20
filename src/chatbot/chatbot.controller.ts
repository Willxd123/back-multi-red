import { RedesInputDto } from './dto/content.dto';
import { Controller, Post, Body, ValidationPipe, UseGuards } from '@nestjs/common';
import { ChatbotService } from './chatbot.service';
import { AuthGuard } from '../auth/guard/auth.guard';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

@ApiTags('chatbot')
@ApiBearerAuth()
@Controller('chatbot')
@UseGuards(AuthGuard) 
export class ChatbotController {
  constructor(private readonly chatbotService: ChatbotService) {}

  @Post('redes')
  async generarContenidoRedes(@Body(ValidationPipe) payload: RedesInputDto) {
    // El servicio se encarga de todo. Retorna rápido el texto mientras procesa video.
    return this.chatbotService.generateSocialContent(payload);
  }
}
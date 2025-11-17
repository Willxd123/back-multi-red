
import { RedesInputDto } from './dto/content.dto';
import { 
  Controller, 
  Post, 
  Body, 
  ValidationPipe, 
  Get,
  HttpException,
  HttpStatus 
} from '@nestjs/common';
import { ChatbotService } from './chatbot.service';

@Controller('chatbot')
export class ChatbotController {
  constructor(private readonly chatbotService: ChatbotService) {}

  @Post('redes')
  async generarContenidoRedes(
    @Body(ValidationPipe) payload: RedesInputDto
  ) {
    return this.chatbotService.generateSocialContent(payload);
  }
  
}
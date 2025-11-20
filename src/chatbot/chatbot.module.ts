import { AuthModule } from 'src/auth/auth.module';
import { Conversation } from './../conversation/entities/conversation.entity';
import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChatbotController } from './chatbot.controller';
import { ChatbotService } from './chatbot.service';
import { Message } from './entities/message.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Conversation, Message]),forwardRef(() => AuthModule, ),
  ],
  controllers: [ChatbotController],
  providers: [ChatbotService],
  exports: [ChatbotService],
})
export class ChatbotModule {}
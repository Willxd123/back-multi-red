import { Message } from './../chatbot/entities/message.entity';
import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConversationService } from './conversation.service';
import { ConversationController } from './conversation.controller';
import { Conversation } from './entities/conversation.entity';
import { AuthModule } from 'src/auth/auth.module';


@Module({
  imports: [
    TypeOrmModule.forFeature([Conversation, Message]), forwardRef(() => AuthModule, ),
  ],
  controllers: [ConversationController],
  providers: [ConversationService],
  exports: [ConversationService,TypeOrmModule],
})
export class ConversationModule {}
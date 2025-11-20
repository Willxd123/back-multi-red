import { Message } from './../chatbot/entities/message.entity';
import { AuthModule } from './../auth/auth.module';
import { PostsService } from './post.service';
import { SocialAccountsModule } from './../social_accounts/social_accounts.module';
import { PostsController } from './post.controller';
import { forwardRef, Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  imports: [
    HttpModule, // Para hacer peticiones HTTP a Facebook Graph API
    SocialAccountsModule, // Para acceder a las cuentas conectadas
    forwardRef(() => AuthModule),
    TypeOrmModule.forFeature([Message])
  ],
  controllers: [PostsController],
  providers: [PostsService],
  exports: [PostsService],
})
export class PostsModule {}
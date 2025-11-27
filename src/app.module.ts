import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersModule } from './users/users.module';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { ChatbotModule } from './chatbot/chatbot.module';
import { SocialAccountsModule } from './social_accounts/social_accounts.module';
import { PostsModule } from './post/post.module';
import { TiktokModule } from './tiktok/tiktok.module';
import { ConversationModule } from './conversation/conversation.module';
import { FacebookModule } from './facebook/facebook.module';
import { InstagramModule } from './instagram/instagram.module';
import { AwsModule } from './aws/aws.module';
import { MediaModule } from './media/media.module';
import { LinkedinModule } from './linkedin/linkedin.module';
import { WhatsappModule } from './whatsapp/whatsapp.module';




@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true, // Hace que las variables de entorno estén disponibles en todo el proyecto
    }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DATABASE_HOST,
      port: parseInt(process.env.DATABASE_PORT),
      username: process.env.DATABASE_USER,
      password: process.env.DATABASE_PASSWORD,
      database: process.env.DATABASE_NAME,
      autoLoadEntities: true, // carga automaticamente las emtidades
      synchronize: true, // Solo para desarrollo; en producción usa migraciones
      ssl: process.env.DATABASE_SSL === 'true',
    }),
    UsersModule,
    AuthModule,
    ChatbotModule,
    SocialAccountsModule,
    PostsModule,
    TiktokModule,
    ConversationModule,
    FacebookModule,
    InstagramModule,
    AwsModule,
    MediaModule,
    LinkedinModule,
    WhatsappModule


  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
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


  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
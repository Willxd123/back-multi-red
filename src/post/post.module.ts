import { InstagramModule } from './../instagram/instagram.module';
import { FacebookModule } from './../facebook/facebook.module';
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
    HttpModule,
    SocialAccountsModule,
    FacebookModule,
    InstagramModule,
    forwardRef(() => AuthModule),
    TypeOrmModule.forFeature([Message])
  ],
  controllers: [PostsController],
  providers: [PostsService],
  exports: [PostsService],
})
export class PostsModule {}
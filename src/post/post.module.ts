import { AuthModule } from './../auth/auth.module';
import { PostsService } from './post.service';
import { SocialAccountsModule } from './../social_accounts/social_accounts.module';
import { PostsController } from './post.controller';
import { forwardRef, Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';

@Module({
  imports: [
    HttpModule, // Para hacer peticiones HTTP a Facebook Graph API
    SocialAccountsModule, // Para acceder a las cuentas conectadas
    forwardRef(() => AuthModule),
  ],
  controllers: [PostsController],
  providers: [PostsService],
  exports: [PostsService],
})
export class PostsModule {}
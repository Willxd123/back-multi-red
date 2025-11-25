import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { FacebookController } from './facebook.controller';
import { FacebookService } from './facebook.service';
import { SocialAccountsModule } from '../social_accounts/social_accounts.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    HttpModule,
    ConfigModule,
    SocialAccountsModule,
    AuthModule,
  ],
  controllers: [FacebookController],
  providers: [FacebookService],
  exports: [FacebookService],
})
export class FacebookModule {}
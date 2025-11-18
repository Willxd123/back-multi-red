import { AuthModule } from './../auth/auth.module';
import { SocialAccountsService } from './social_accounts.service';
import { SocialAccountsController } from './social_accounts.controller';
import { SocialAccount } from './entities/social_account.entity';
import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TiktokModule } from 'src/tiktok/tiktok.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([SocialAccount]),
    forwardRef(() => AuthModule, ),
    
  ],
  controllers: [SocialAccountsController],
  providers: [SocialAccountsService],
  exports: [SocialAccountsService, TypeOrmModule],
})
export class SocialAccountsModule {}

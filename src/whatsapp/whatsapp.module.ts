import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { WhatsappController } from './whatsapp.controller';
import { WhatsappService } from './whatsapp.service';
import { AuthModule } from '../auth/auth.module';
import { AwsModule } from '../aws/aws.module';

@Module({
  imports: [
    HttpModule,
    ConfigModule,
    AuthModule,
    AwsModule,
  ],
  controllers: [WhatsappController],
  providers: [WhatsappService],
  exports: [WhatsappService],
})
export class WhatsappModule {}
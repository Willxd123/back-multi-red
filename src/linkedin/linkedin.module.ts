import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { LinkedinController } from './linkedin.controller';
import { LinkedinService } from './linkedin.service';
import { AuthModule } from '../auth/auth.module';
import { AwsModule } from '../aws/aws.module';

@Module({
  imports: [
    HttpModule,
    ConfigModule,
    AuthModule,
    AwsModule, // Para subir imágenes a S3
  ],
  controllers: [LinkedinController],
  providers: [LinkedinService],
  exports: [LinkedinService],
})
export class LinkedinModule {}
import { Module } from '@nestjs/common';
import { TiktokController } from './tiktok.controller';
import { TiktokService } from './tiktok.service';
import { SocialAccountsModule } from '../social_accounts/social_accounts.module';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from 'src/auth/auth.module';

@Module({
  imports: [
    ConfigModule, // Para acceder a las variables de entorno
    SocialAccountsModule, // Para manejar las cuentas sociales
    AuthModule
  ],
  controllers: [TiktokController],
  providers: [TiktokService],
  exports: [TiktokService],
})
export class TiktokModule {}
import { SocialAccountsModule } from './../social_accounts/social_accounts.module';
import { FacebookAuthGuard } from './guard/facebook-auth.guard';
import { FacebookConnectGuard } from './guard/facebook-connect.guard';
import { FacebookStrategy } from './strategies/facebook.strategy';
import { FacebookConnectStrategy } from './strategies/facebook-connect.strategy';
import { forwardRef, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { UsersModule } from 'src/users/users.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { GoogleStrategy } from './strategies/google.strategy';
import { GoogleAuthGuard } from './guard/google-auth.guard';
import { PassportModule } from '@nestjs/passport';
import { TikTokAuthGuard } from './guard/tiktok-auth.guard';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'google' }),
    forwardRef(() => UsersModule), 
    SocialAccountsModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        global: true,
        signOptions: { expiresIn: '1d' },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService, 
    GoogleStrategy, 
    GoogleAuthGuard, 
    FacebookStrategy, 
    FacebookAuthGuard,
    FacebookConnectStrategy, // ⬅️ NUEVA STRATEGY
    FacebookConnectGuard,     // ⬅️ NUEVO GUARD
    TikTokAuthGuard
  ],
  exports: [JwtModule],
})
export class AuthModule {}
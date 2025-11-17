import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Profile, Strategy } from 'passport-facebook';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class FacebookStrategy extends PassportStrategy(Strategy, 'facebook') {
  constructor(private configService: ConfigService) {
    super({
      clientID: configService.get<string>('FACEBOOK_APP_ID'),
      clientSecret: configService.get<string>('FACEBOOK_APP_SECRET'),
      callbackURL: configService.get<string>('FACEBOOK_CALLBACK_URL'),
      
      // Permisos básicos
      scope: ['public_profile', 'email'],
      
      // Campos del perfil
      profileFields: ['id', 'emails', 'name', 'displayName'],
      
      passReqToCallback: true,
      enableProof: true,
      state: true, // ⬅️ Habilitar state para pasar el JWT
    });
  }

  async validate(
    req: any,
    accessToken: string,
    refreshToken: string,
    profile: Profile,
    done: (err: any, user: any, info?: any) => void,
  ): Promise<void> {
    try {
      console.log('📘 Facebook Profile recibido:', profile);
      console.log('🔑 Access Token recibido:', accessToken);
      
      const { name, id, emails } = profile;
      
      const user = {
        email: emails && emails.length > 0 ? emails[0].value : null,
        facebookId: id,
        name: profile.displayName || `${name?.givenName || ''} ${name?.familyName || ''}`.trim(),
        facebookAccessToken: accessToken,
      };
      
      console.log('✅ Usuario mapeado:', user);
      done(null, user);
    } catch (error) {
      console.error('❌ Error en Facebook Strategy:', error);
      done(error, null);
    }
  }
}
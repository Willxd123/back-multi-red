/* import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Profile, Strategy } from 'passport-facebook';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class FacebookConnectStrategy extends PassportStrategy(Strategy, 'facebook-connect') {
  constructor(private configService: ConfigService) {
    super({
      clientID: configService.get<string>('FACEBOOK_APP_ID'),
      clientSecret: configService.get<string>('FACEBOOK_APP_SECRET'),
      // ⬅️ USAR LA MISMA URL que está configurada en Facebook
      callbackURL: configService.get<string>('FACEBOOK_CALLBACK_URL'), 
      
      scope: ['public_profile', 'email'],
      profileFields: ['id', 'emails', 'name', 'displayName'],
      passReqToCallback: true,
      enableProof: true,
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
      console.log('📘 Facebook Connect - Profile recibido:', profile);
      console.log('🔑 Access Token:', accessToken);
      
      const { name, id, emails } = profile;
      
      const user = {
        email: emails && emails.length > 0 ? emails[0].value : null,
        facebookId: id,
        name: profile.displayName || `${name?.givenName || ''} ${name?.familyName || ''}`.trim(),
        facebookAccessToken: accessToken,
      };
      
      console.log('✅ Usuario para conectar:', user);
      done(null, user);
    } catch (error) {
      console.error('❌ Error:', error);
      done(error, null);
    }
  }
} */
  import { Injectable } from '@nestjs/common';
  import { PassportStrategy } from '@nestjs/passport';
  import { Profile, Strategy } from 'passport-facebook';
  import { ConfigService } from '@nestjs/config';
  
  @Injectable()
  export class FacebookConnectStrategy extends PassportStrategy(Strategy, 'facebook-connect') {
    constructor(private configService: ConfigService) {
      super({
        clientID: configService.get<string>('FACEBOOK_APP_ID'),
        clientSecret: configService.get<string>('FACEBOOK_APP_SECRET'),
        callbackURL: configService.get<string>('FACEBOOK_CALLBACK_URL'), 
        
        // ⬅️ AGREGAR PERMISOS PARA PÁGINAS
        scope: [
          'public_profile', 
          'email',
          'pages_show_list',        // Ver lista de páginas
          'pages_read_engagement',  // Leer engagement de páginas
          'pages_manage_posts',     // Publicar en páginas
        ],
        
        profileFields: ['id', 'emails', 'name', 'displayName'],
        passReqToCallback: true,
        enableProof: true,
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
        console.log('📘 Facebook Connect - Profile recibido:', profile);
        console.log('🔑 Access Token:', accessToken);
        
        const { name, id, emails } = profile;
        
        const user = {
          email: emails && emails.length > 0 ? emails[0].value : null,
          facebookId: id,
          name: profile.displayName || `${name?.givenName || ''} ${name?.familyName || ''}`.trim(),
          facebookAccessToken: accessToken,
        };
        
        console.log('✅ Usuario para conectar:', user);
        done(null, user);
      } catch (error) {
        console.error('❌ Error:', error);
        done(error, null);
      }
    }
  }
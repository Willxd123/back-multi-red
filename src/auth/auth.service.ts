import { SocialAccountsService } from './../social_accounts/social_accounts.service';
import {
  BadGatewayException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { UsersService } from 'src/users/users.service';
import { RegisterDto } from './dto/register.dto';
import * as bcryptjs from 'bcryptjs';
import { LogingDto } from './dto/login.dto';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private jwtService: JwtService,
    private readonly socialAccountsService: SocialAccountsService, // ⬅️ INYECTAR
  ) {}

  async register({ name, email, password }: RegisterDto) {
    const user = await this.usersService.findOneByEmail(email);
    if (user) {
      throw new BadGatewayException('User already exists');
    }
    await this.usersService.create({
      name,
      email,
      password: await bcryptjs.hash(password, 10),
    });
    return {
      name,
      email,
    };
  }

  async login({ email, password }: LogingDto) {
    const user = await this.usersService.findByEmailWithPassword(email);
    if (!user) {
      throw new UnauthorizedException('email is wrong');
    }
    const isPasswordValid = await bcryptjs.compare(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('password is wrong');
    }
    const payload = { id: user.id, email: user.email, role: user.role };
    const token = await this.jwtService.signAsync(payload);
    return {
      token,
      email,
    };
  }

  async profile({ email, role }: { email: string; role: string }) {
    return await this.usersService.findOneByEmail(email);
  }

  // ⬅️ NUEVO: Login con Google (para AUTENTICACIÓN)
  async googleLogin(user: any): Promise<{ token: string; user: any }> {
    let existingUser = await this.usersService.findOneByEmail(user.email);
  
    if (!existingUser) {
      existingUser = await this.usersService.create({
        email: user.email,
        name: `${user.firstName} ${user.lastName}`,
        password: null,
      });
    }
  
    const token = await this.jwtService.signAsync({ 
      id: existingUser.id, 
      email: existingUser.email,
      role: existingUser.role,
    });
  
    return {
      token,
      user: {
        id: existingUser.id,
        name: existingUser.name,
        email: existingUser.email,
        role: existingUser.role,
      },
    };
  }

  // ⬅️ NUEVO: Login con Facebook (para AUTENTICACIÓN - solo pruebas)
  async facebookLogin(user: any): Promise<{ token: string; user: any }> {
    const { facebookId, name, facebookAccessToken } = user;
    
    let existingUser = await this.usersService.findOneByFacebookId(facebookId);
    
    if (!existingUser) {
      existingUser = await this.usersService.create({
        email: null,
        name: name,
        password: null, 
        facebookId: facebookId,
      });
    }
    
    const payload = { 
      id: existingUser.id, 
      email: existingUser.email, 
      role: existingUser.role 
    };

    const token = await this.jwtService.signAsync(payload);
  
    return {
      token,
      user: {
        id: existingUser.id,
        name: existingUser.name,
        email: existingUser.email,
        role: existingUser.role,
        facebookAccessToken: facebookAccessToken,
      },
    };
  }

  // ⬅️ NUEVO: Conectar Facebook a usuario YA autenticado
  async connectFacebook(userId: number, facebookData: any): Promise<{ message: string }> {
    const { facebookId, facebookAccessToken } = facebookData;
    
    // Guardar o actualizar la cuenta de Facebook vinculada
    await this.socialAccountsService.upsertAccount(
      userId,
      'facebook',
      facebookId,
      facebookAccessToken,
      null, // Facebook tokens no expiran fácilmente, pero puedes calcularlo
    );

    return {
      message: 'Facebook conectado exitosamente',
    };
  }

  /**
   * Login o registro con TikTok
   */
  async tiktokLogin(tiktokData: any) {
    const { tiktokId, username, displayName, accessToken, refreshToken } = tiktokData;

    // Buscar si ya existe una cuenta con este TikTok ID
    let user = await this.usersService.findByTikTokId(tiktokId);

    if (!user) {
      // Crear nuevo usuario
      user = await this.usersService.createFromTikTok({
        username: username || displayName,
        tiktokId: tiktokId,
      });

      // Guardar la conexión de TikTok
      await this.socialAccountsService.upsertAccount(
        user.id,
        'tiktok',
        tiktokId,
        accessToken,
        null, // expiresAt
      );
    } else {
      // Actualizar token
      await this.socialAccountsService.upsertAccount(
        user.id,
        'tiktok',
        tiktokId,
        accessToken,
        null, // expiresAt
      );
    }

    // Generar JWT
    const token = await this.generateJwt(user);

    return { token, user };
  }

  /**
   * Genera un JWT para el usuario dado.
   */
  private async generateJwt(user: any): Promise<string> {
    const payload = {
      id: user.id,
      email: user.email,
      role: user.role,
    };
    return this.jwtService.signAsync(payload);
  }

  /**
   * Conectar TikTok a una cuenta existente
   */
  async connectTikTok(userId: number, tiktokData: any) {
    const { tiktokId, username, accessToken, refreshToken } = tiktokData;

    await this.socialAccountsService.upsertAccount(
      userId,
      'tiktok',
      tiktokId,
      accessToken,
      null, // expiresAt
    );

    return { success: true };
  }
}
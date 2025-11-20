
import { SocialAccount } from './../social_accounts/entities/social_account.entity';
import { Injectable } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Not, IsNull } from 'typeorm'; // Importar Not e IsNull
import * as bcryptjs from 'bcryptjs';
import { User } from './entities/user.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(SocialAccount)
    private readonly socialAccountRepository: Repository<SocialAccount>,
  ) {}

  // Permite la creación con campos opcionales como facebookId y email: null
  create(createUserDto: CreateUserDto & { facebookId?: string, email?: string | null }) {
    return this.userRepository.save(createUserDto);
  }
  

  //retorna si existe o no el usuario en la bd (usa email)
  findOneByEmail(email: string) {
    return this.userRepository.findOneBy({ email });
  }
  
  //retorna los datos del usuario menos la contraseña luego de loguearse (usa email)
  findByEmailWithPassword(email: string) {
    // Esto se usa para el login local. Funciona porque el email es único.
    return this.userRepository.findOne({
      where: { email },
      select: ['id', 'name', 'email', 'password', ],
    });
  }


  findAll() {
    return this.userRepository.find();
  }

  async findOne(id: number) {
    return this.userRepository.findOne({
      where: { id },
      select: ['id', 'name', 'email', ],
    });
  }

  update(id: number, updateUserDto: UpdateUserDto) {
    return `This action updates a #${id} user`;
  }

  remove(id: number) {
    return `This action removes a #${id} user`;
  }

  /**
   * Buscar usuario por TikTok ID
   */
  async findByTikTokId(tiktokId: string): Promise<User | null> {
    const socialAccount = await this.socialAccountRepository.findOne({
      where: {
        provider: 'tiktok',
        providerId: tiktokId,
      },
      relations: ['user'],
    });

    return socialAccount?.user || null;
  }

  /**
   * Crear usuario desde TikTok
   */
  async createFromTikTok(data: { username: string; tiktokId: string }): Promise<User> {
    const newUser = this.userRepository.create({
      name: data.username,
      email: `tiktok_${data.tiktokId}@temp.com`, // Email temporal
      password: await bcryptjs.hash(Math.random().toString(36), 10), // Password random

    });

    return this.userRepository.save(newUser);
  }
}
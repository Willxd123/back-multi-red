import { SocialAccount } from './entities/social_account.entity';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

@Injectable()
export class SocialAccountsService {
  constructor(
    @InjectRepository(SocialAccount)
    private readonly socialAccountRepository: Repository<SocialAccount>,
  ) {}

  // Guardar o actualizar una cuenta social
  // Guardar o actualizar una cuenta social
  async upsertAccount(
    userId: number,
    provider: string,
    providerId: string,
    accessToken: string,
    expiresAt?: Date,
    refreshToken?: string,  // ⬅️ AGREGAR
    username?: string,      // ⬅️ AGREGAR
  ): Promise<SocialAccount> {
    // Buscar si ya existe una cuenta de este proveedor para este usuario
    let account = await this.socialAccountRepository.findOne({
      where: { userId, provider },
    });

    if (account) {
      // Actualizar el token existente
      account.providerId = providerId;
      account.accessToken = accessToken;
      account.expiresAt = expiresAt;
      account.refreshToken = refreshToken || account.refreshToken; // ⬅️ AGREGAR
      account.username = username || account.username;             // ⬅️ AGREGAR
      account.updatedAt = new Date();
    } else {
      // Crear nueva cuenta
      account = this.socialAccountRepository.create({
        userId,
        provider,
        providerId,
        accessToken,
        expiresAt,
        refreshToken,  // ⬅️ AGREGAR
        username,      // ⬅️ AGREGAR
      });
    }

    return await this.socialAccountRepository.save(account);
  }

  // Obtener una cuenta social específica
  async getAccount(userId: number, provider: string): Promise<SocialAccount> {
    return await this.socialAccountRepository.findOne({
      where: { userId, provider },
    });
  }

  // Obtener todas las cuentas sociales de un usuario
  async getUserAccounts(userId: number): Promise<SocialAccount[]> {
    return await this.socialAccountRepository.find({
      where: { userId },
    });
  }

  // Eliminar una cuenta social
  async removeAccount(userId: number, provider: string): Promise<void> {
    await this.socialAccountRepository.delete({ userId, provider });
  }

  // Verificar si un usuario tiene conectada una red social
  async hasAccount(userId: number, provider: string): Promise<boolean> {
    const count = await this.socialAccountRepository.count({
      where: { userId, provider },
    });
    return count > 0;
  }
}
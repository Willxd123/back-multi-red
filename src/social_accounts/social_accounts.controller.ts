import { SocialAccountsService } from './social_accounts.service';
import { Controller, Get, Delete, Param, UseGuards } from '@nestjs/common';

import { AuthGuard } from 'src/auth/guard/auth.guard';
import { ActiveUser } from 'src/common/decorators/active-user.decorator';
import { UserActiveInterface } from 'src/common/interfaces/user-active.interface';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

@ApiTags('social-accounts')
@ApiBearerAuth()
@Controller('social-accounts')
@UseGuards(AuthGuard)
export class SocialAccountsController {
  constructor(private readonly socialAccountsService: SocialAccountsService) {}

  // Obtener todas las cuentas sociales del usuario autenticado
  @Get()
  async getUserAccounts(@ActiveUser() user: UserActiveInterface) {
    const accounts = await this.socialAccountsService.getUserAccounts(user.id);
    
    // No devolvemos el access_token completo por seguridad
    return accounts.map(account => ({
      id: account.id,
      provider: account.provider,
      providerId: account.providerId,
      connected: true,
      connectedAt: account.createdAt,
    }));
  }

  // Desconectar una cuenta social
  @Delete(':provider')
  async disconnectAccount(
    @ActiveUser() user: UserActiveInterface,
    @Param('provider') provider: string,
  ) {
    await this.socialAccountsService.removeAccount(user.id, provider);
    return { message: `${provider} desconectado exitosamente` };
  }
}
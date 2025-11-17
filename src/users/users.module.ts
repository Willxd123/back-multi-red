import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { SocialAccount } from '../social_accounts/entities/social_account.entity'; // <-- Agrega esto

@Module({
  imports: [
    TypeOrmModule.forFeature([User, SocialAccount]), // <-- Agrega SocialAccount aquí
  ],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService, TypeOrmModule],
})
export class UsersModule {}
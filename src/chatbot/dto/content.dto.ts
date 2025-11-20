import { IsInt, IsNotEmpty, IsString } from 'class-validator';

export class RedesInputDto {
  @IsString()
  @IsNotEmpty()
  prompt: string;

  @IsInt()
  @IsNotEmpty()
  conversationId: number; // ⬅️ Campo necesario para la relación
}
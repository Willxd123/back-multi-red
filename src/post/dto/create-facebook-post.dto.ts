import { IsNotEmpty, IsString, IsOptional } from 'class-validator';

export class CreateFacebookPostDto {
  @IsNotEmpty()
  @IsString()
  message: string; // Mensaje a publicar

  @IsOptional()
  @IsString()
  link?: string; // URL opcional para compartir

  @IsOptional()
  @IsString()
  imageUrl?: string; // URL de imagen opcional
}
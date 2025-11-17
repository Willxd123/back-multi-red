import { IsArray, IsString } from 'class-validator';

export class RedesInputDto {
  @IsString()
  titulo: string;

  @IsString()
  contenido: string;

  @IsArray()
  target_networks: string[];
}

export class RedesOutputDto {
  [key: string]: any;
}

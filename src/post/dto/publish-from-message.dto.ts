import { IsInt, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class PublishFromMessageDto {
  @ApiProperty({
    description: 'ID del mensaje que contiene el contenido a publicar',
    example: 16
  })
  @IsInt()
  @IsNotEmpty()
  messageId: number;
}
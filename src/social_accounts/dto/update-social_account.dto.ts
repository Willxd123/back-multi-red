import { PartialType } from '@nestjs/swagger';
import { CreateSocialAccountDto } from './create-social_account.dto';

export class UpdateSocialAccountDto extends PartialType(CreateSocialAccountDto) {}

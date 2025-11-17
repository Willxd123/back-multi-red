import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class FacebookConnectGuard extends AuthGuard('facebook-connect') {}
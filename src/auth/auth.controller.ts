
import { AuthGuard } from './guard/auth.guard';
import {
  Controller,
  Post,
  Body,
  Get,
  Req,
  UseGuards,
  Res,
  UnauthorizedException,
  Query,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LogingDto } from './dto/login.dto';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ActiveUser } from 'src/common/decorators/active-user.decorator';

import { JwtService } from '@nestjs/jwt';
import { Response } from 'express';

// Map temporal para vincular conexiones pendientes
const pendingConnections = new Map<string, number>();

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly jwtService: JwtService,
  ) {}

  @Post('register')
  register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Post('login')
  login(@Body() loginDto: LogingDto) {
    return this.authService.login(loginDto);
  }


}
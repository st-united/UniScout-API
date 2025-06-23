import { ResponseItem } from '@app/common/dtos';
import { Body, Controller, Get, Headers, HttpCode, Post, Req, UseGuards } from '@nestjs/common';

import { AuthService } from './auth.service';
import { TokenDto } from './dto/token.dto';
import { JwtAccessTokenGuard } from './guards/jwt-access-token.guard';
import { JwtRefreshTokenGuard } from './guards/jwt-refresh-token.guard';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { RegisterUserDto } from './dto/register-user.dto';
import { UserDto } from '@UsersModule/dto/user.dto';
import { UserRole } from '@Constant/enums';
import { Roles } from '@Decorators/roles.decorator';
import { RolesGuard } from '@Guards/roles.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @UseGuards(LocalAuthGuard)
  @HttpCode(200)
  @Post('login')
  async login(@Req() request): Promise<ResponseItem<TokenDto>> {
    return this.authService.login(request.user);
  }

  @UseGuards(JwtAccessTokenGuard)
  @Get('logout')
  async logout(@Req() request) {
    return this.authService.logout(request.user.userId);
  }

  @UseGuards(JwtRefreshTokenGuard)
  @HttpCode(200)
  @Get('refresh')
  refresh(@Headers('Authorization') auth: string) {
    const token = auth.replace('Bearer ', '');
    return this.authService.refreshToken(token);
  }

  @HttpCode(200)
  @Post('register')
  @UseGuards(JwtAccessTokenGuard, RolesGuard)
  @Roles(UserRole.SUPER)
  async register(@Body() registerDto: RegisterUserDto): Promise<ResponseItem<UserDto>> {
    return this.authService.register(registerDto);
  }
}

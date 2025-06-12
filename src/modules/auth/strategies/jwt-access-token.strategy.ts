import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtPayload } from '@Constant/types';

@Injectable()
export class JwtAccessTokenStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(private readonly configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: configService.get<string>('JWT_ACCESS_SECRETKEY'),
      ignoreExpiration: false,
    });
  }

  async validate(payload: JwtPayload) {
    const user = {
      userId: String(payload.sub),
      email: payload.email,
      role: payload.role,
    };

    if (!user) {
      throw new UnauthorizedException('Session expired. Please log in again.');
    }
    return user;
  }
}

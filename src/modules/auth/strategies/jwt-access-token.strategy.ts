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
    console.log('--- JwtAccessTokenStrategy Validate Method Debugging ---');
    console.log('1. Received JWT payload in validate method:', payload);
    console.log('2. Type of payload.sub:', typeof payload.sub);
    console.log('3. Value of payload.role:', payload.role);
    console.log('4. Type of payload.role:', typeof payload.role);

    const user = {
      userId: String(payload.sub),
      email: payload.email,
      role: payload.role,
    };

    console.log('5. User object prepared for request.user:', user);
    if (!user) {
      throw new UnauthorizedException('Session expired. Please log in again.');
    }
    return user;
  }
}

import { Strategy } from 'passport-local';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { Request } from 'express';

import { AuthService } from '../auth.service';
import { UserPayloadDto } from '../dto/user-payload.dto';

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
  constructor(private authService: AuthService) {
    super({
      usernameField: 'email',
      passReqToCallback: true,
    });
  }

  async validate(req: Request, email: string, password: string): Promise<UserPayloadDto> {
    const ipAddress = req.ipAddress as string;
    const userAgent = req.userAgent as string;

    const user = await this.authService.validateUser({ email, password }, ipAddress, userAgent);

    if (!user) {
      throw new UnauthorizedException();
    }
    return user;
  }
}

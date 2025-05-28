// src/modules/auth/strategies/jwt-access-token.strategy.ts

import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

// Make sure this import path is correct and points to your updated types.ts
import { JwtPayload } from '@Constant/types';

@Injectable()
// Ensure the strategy name matches what you use in AuthGuard, which is 'jwt'
export class JwtAccessTokenStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(private readonly configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: configService.get<string>('JWT_ACCESS_SECRETKEY'),
      ignoreExpiration: false, // Recommended to let Passport handle expiration
    });
  }

  // The 'payload' argument here is the decoded JWT payload from the token
  async validate(payload: JwtPayload) {
    console.log('--- JwtAccessTokenStrategy Validate Method Debugging ---');
    console.log('1. Received JWT payload in validate method:', payload);
    console.log('2. Type of payload.sub:', typeof payload.sub);
    console.log('3. Value of payload.role:', payload.role);
    console.log('4. Type of payload.role:', typeof payload.role);

    // This is the object that Passport will attach to 'request.user'.
    // Ensure that userId is correctly extracted and that 'role' is definitely included.
    const user = {
      userId: String(payload.sub), // Explicitly convert sub to string if it's a number in type def but string in token
      email: payload.email,
      role: payload.role, // This should now correctly bring the 'role'
    };

    console.log('5. User object prepared for request.user:', user);
    return user; // Passport will attach this 'user' object to `request.user`
  }
}
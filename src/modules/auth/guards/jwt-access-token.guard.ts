import { Injectable, UnauthorizedException, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAccessTokenGuard extends AuthGuard('jwt') {
  canActivate(context: ExecutionContext) {
    console.log('--- JwtAccessTokenGuard Debugging ---');
    const request = context.switchToHttp().getRequest();
    console.log('  1. Request headers.authorization:', request.headers.authorization);
    return super.canActivate(context);
  }
  handleRequest(err, user, info) {
    console.log('  2. Inside JwtAccessTokenGuard handleRequest:');
    console.log('     err:', err);
    console.log('     user:', user);
    console.log('     info:', info);
    if (err || !user) {
      console.error('  3. JwtAccessTokenGuard: Unauthorized - Error or no user detected.');
      throw err || new UnauthorizedException('Authentication failed: No valid token provided or token invalid.');
    }

    console.log('  4. JwtAccessTokenGuard: User authenticated. Attaching to request.user:', user);
    return user;
  }
}

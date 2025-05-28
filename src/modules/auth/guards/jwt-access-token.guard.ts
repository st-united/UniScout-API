// src/auth/guards/jwt-access-token.guard.ts
import { Injectable, UnauthorizedException, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAccessTokenGuard extends AuthGuard('jwt') {
  // You can keep canActivate if you want to add custom logic before authentication,
  // or just rely on the default behavior of AuthGuard for canActivate.
  // For now, let's keep it to see the initial log.
  canActivate(context: ExecutionContext) {
    console.log('--- JwtAccessTokenGuard Debugging ---');
    const request = context.switchToHttp().getRequest();
    console.log('  1. Request headers.authorization:', request.headers.authorization);

    // Call the super method to run the Passport-JWT logic.
    // This will eventually call your JwtStrategy's validate method,
    // and then this guard's handleRequest method.
    return super.canActivate(context);
  }

  // This method is called by AuthGuard('jwt') after its internal strategy logic
  // (which includes your JwtStrategy's `validate` method).
  handleRequest(err, user, info) {
    console.log('  2. Inside JwtAccessTokenGuard handleRequest:');
    console.log('     err:', err); // Will be an error object if token validation failed
    console.log('     user:', user); // Will be the user object from JwtStrategy.validate, or undefined/null
    console.log('     info:', info); // Contains additional info, e.g., { message: 'No auth token' }

    // If there's an error during token validation (e.g., malformed, expired)
    // OR if the JwtStrategy's `validate` method returned `null` or `false` (meaning no valid user found)
    if (err || !user) {
      console.error('  3. JwtAccessTokenGuard: Unauthorized - Error or no user detected.');
      // Throw an UnauthorizedException. This is crucial for stopping the request
      // and returning a 401 status code if authentication fails.
      throw err || new UnauthorizedException('Authentication failed: No valid token provided or token invalid.');
    }

    console.log('  4. JwtAccessTokenGuard: User authenticated. Attaching to request.user:', user);
    // Return the user object. This user object will then be attached to `request.user`.
    return user;
  }
}

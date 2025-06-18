// src/common/guards/roles.guard.ts
import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { UserRole } from '../constants/enums';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    console.log('--- RolesGuard Debugging ---');
    console.log('1. Required Roles from @Roles():', requiredRoles);

    if (!requiredRoles) {
      console.log('2. No roles required, allowing access.');
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user; // This is populated by your authentication guard

    console.log('3. User object from request.user:', user);
    console.log('4. User role property (user?.role):', user?.role);

    if (!user) {
      console.error('5. Error: User not authenticated. This should ideally be caught by JwtAccessTokenGuard.');
      throw new UnauthorizedException('User not authenticated.'); // This should now ideally not be hit if JwtAccessTokenGuard works
    }

    const hasRequiredRole = requiredRoles.some((role) => user.role === role);
    console.log(`6. User has required role (${user.role} in [${requiredRoles.join(', ')}]):`, hasRequiredRole);

    return hasRequiredRole;
  }
}

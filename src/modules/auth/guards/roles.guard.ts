// src/auth/guards/roles.guard.ts
import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '@Constant/enums'; // Your UserRole enum
import { ROLES_KEY } from '../decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // Get the required roles from the @Roles() decorator metadata
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // If no roles are specified for the route, allow access
    if (!requiredRoles) {
      return true;
    }

    // Get the user from the request (attached by JwtStrategy)
    const { user } = context.switchToHttp().getRequest();

    // Check if the user's role is included in the required roles
    // Use user?.role to safely access role if user might be undefined
    return requiredRoles.some((role) => user?.role === role);
  }
}
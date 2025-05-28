// src/auth/decorators/current-user.decorator.ts
import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { UserEntity } from '../../users/entities/user.entity'; // Import your UserEntity

export const CurrentUser = createParamDecorator((data: unknown, ctx: ExecutionContext): UserEntity => {
  // Or whatever type your user object is
  const request = ctx.switchToHttp().getRequest();
  return request.user; // Assuming your JWT guard attaches the user to request.user
});

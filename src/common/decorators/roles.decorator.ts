// src/common/decorators/roles.decorator.ts
import { SetMetadata } from '@nestjs/common';
import { UserRole } from '../constants/enums'; // Adjust path if needed

export const ROLES_KEY = 'roles'; // <-- THIS LINE MUST HAVE 'export'
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);

// src/modules/users/dto/user.dto.ts
import { Expose } from 'class-transformer'; // <-- ADD THIS IMPORT
import { StatusEnum, UserRole } from '@Constant/enums'; // <-- ADD UserRole import from your constants/enums

export class UserDto {
  @Expose()
  id: number; // <-- ADD THIS LINE

  @Expose()
  email: string;

  @Expose()
  phone: string;

  @Expose()
  status: StatusEnum;

  @Expose()
  name: string;

  // @Expose() // <-- REMOVE OR COMMENT OUT THIS FIELD COMPLETELY. Passwords should not be exposed.
  // password: string;

  @Expose()
  dateOfBirth: Date;

  @Expose()
  address: string;

  @Expose()
  identityId: string;

  @Expose()
  role: UserRole; // <-- ADD THIS LINE to expose the user's role
}

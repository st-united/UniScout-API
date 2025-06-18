import { Expose } from 'class-transformer';
import { StatusEnum, UserRole } from '@Constant/enums';

export class UserDto {
  @Expose()
  id: number;

  @Expose()
  email: string;

  @Expose()
  phone: string;

  @Expose()
  status: StatusEnum;

  @Expose()
  name: string;

  @Expose()
  dateOfBirth: Date;

  @Expose()
  address: string;

  @Expose()
  identityId: string;

  @Expose()
  role: UserRole; // <-- ADD THIS LINE to expose the user's role
}

import { Expose } from 'class-transformer';
import { StatusEnum, UserRole } from '@Constant/enums';

export class UserDto {
  @Expose()
  id: number;

  @Expose()
  email: string;

  @Expose()
  phone?: string;

  @Expose()
  avatar?: string;

  @Expose()
  status: StatusEnum;

  @Expose()
  name: string;

  @Expose()
  dateOfBirth?: Date;

  @Expose()
  address?: string;

  @Expose()
  identityId?: number;

  @Expose()
  role: UserRole;

  @Expose()
  createdAt: Date;

  @Expose()
  updatedAt: Date;

  @Expose()
  deletedAt?: Date;

  @Expose()
  deletedBy?: string;
}

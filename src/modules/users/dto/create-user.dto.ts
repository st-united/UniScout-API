import { Expose, Transform } from 'class-transformer';
import { IsNotEmpty } from 'class-validator';

import { StatusEnum } from '@Constant/enums';

export class CreateUserDto {
  @Expose()
  avatar: string;

  @Expose()
  @IsNotEmpty()
  email: string;

  @Expose()
  @IsNotEmpty()
  phone: string;

  @Expose()
  @IsNotEmpty()
  password: string;

  @Expose()
  status: StatusEnum;

  @Expose()
  @IsNotEmpty()
  name: string;

  @Expose()
  dateOfBirth: Date;

  @Expose()
  address: string;

  @Expose()
  identityId: string;

  @Expose()
  roleId: number;
}

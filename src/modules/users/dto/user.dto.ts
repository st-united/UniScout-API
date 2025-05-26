import { StatusEnum } from '@Constant/enums';

export class UserDto {
  email: string;

  phone: string;

  status: StatusEnum;

  name: string;

  password: string;

  dateOfBirth: Date;

  address: string;

  identityId: string;
}

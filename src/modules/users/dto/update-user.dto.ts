import { Expose } from 'class-transformer';
import { StatusEnum } from '@Constant/enums';
import { IsNotEmpty } from 'class-validator';

export class UpdateUserDto {
  @Expose()
  @IsNotEmpty()
  email: string;

  @Expose()
  @IsNotEmpty()
  name: string;

  @Expose()
  status: StatusEnum;

  @Expose()
  @IsNotEmpty()
  phone: string;

  @Expose()
  address: string;

  @Expose()
  dateOfBirth: number;

  @Expose()
  identityId: string;
}

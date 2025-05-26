import { Expose } from 'class-transformer';

export class ProfileDto {
  @Expose()
  email: string;

  @Expose()
  phone: string;

  @Expose()
  name: string;

  password: string;

  @Expose()
  dateOfBirth: Date;

  @Expose()
  address: string;

  @Expose()
  identityId: string;

  @Expose()
  avatar: string;
}

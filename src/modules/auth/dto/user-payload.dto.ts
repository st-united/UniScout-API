import { Expose } from 'class-transformer';
import { UserRole } from '../../../common/constants/enums'; // Ensure this path is correct

export class UserPayloadDto {
  @Expose()
  id: number;

  @Expose()
  email: string;

  @Expose()
  name: string;

  @Expose()
  role: UserRole;
}

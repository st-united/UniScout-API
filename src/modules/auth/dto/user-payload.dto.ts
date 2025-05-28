// src/modules/auth/dto/user-payload.dto.ts
import { UserRole } from '../../../common/constants/enums'; // Ensure this path is correct

export class UserPayloadDto {
  id: number;
  email: string;
  name: string;
  role: UserRole; // <--- ADD THIS LINE
}
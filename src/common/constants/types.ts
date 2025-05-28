import { UserRole } from './enums'; // Adjust path if your enums are elsewhere, e.g., '../enums'

export interface JwtPayload {
  sub: number; // This is the user ID from your strategy's validate method
  email: string;
  role: string; // <--- ADD THIS LINE
  // If you have other properties like iat (issued at) or exp (expiration), they can be here too
}

import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';
export class RegisterUserDto {
  @IsEmail({}, { message: 'Please provide a valid email address.' })
  @IsNotEmpty({ message: 'Email cannot be empty.' })
  email: string;
  @IsString({ message: 'Password must be a string.' })
  @IsNotEmpty({ message: 'Password cannot be empty.' })
  @MinLength(8, { message: 'Password must be at least 8 characters long.' }) // Add password validation rules
  password: string; // <-- THIS IS THE MISSING PIECE
  // Add other fields that you expect in the registration payload
  // @IsString()
  // name?: string;
  // etc.
}

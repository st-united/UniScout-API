// src/contact/dto/create-contact.dto.ts
import { IsEmail, IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateContactDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(1000) // Adjust max length as needed
  message: string;

  // Optional: Subject field
  @IsString()
  @MaxLength(200)
  subject?: string;
}


import { IsEmail, IsNotEmpty, IsString, MaxLength, IsPhoneNumber,IsOptional, IsEnum } from 'class-validator';
import { RequestTypeEnum } from '@Constant/enums';

export class CreateContactDto {
  @IsString()
  @IsNotEmpty({ message: 'Name cannot be empty.' })
  @MaxLength(100, { message: 'Name cannot exceed 100 characters.' })
  name: string;

  @IsEmail({}, { message: 'Please provide a valid email address.' })
  @IsNotEmpty({ message: 'Email cannot be empty.' })
  email: string;

  @IsString()
  @IsNotEmpty({ message: 'Message cannot be empty.' })
  @MaxLength(1000, { message: 'Message cannot exceed 1000 characters.' }) 
  message: string;

  @IsString()
  @MaxLength(200, { message: 'Subject cannot exceed 200 characters.' })
  @IsNotEmpty() 
  subject?: string;

 
  @IsString()
  @IsNotEmpty() 
  @MaxLength(255, { message: 'University name cannot exceed 255 characters.' })
  universityName?: string;

  @IsString()
  @IsNotEmpty() 
  @IsPhoneNumber('VN', { message: 'Please provide a valid phone number.' })
  phoneNumber?: string;

  @IsEnum(RequestTypeEnum, { message: 'Invalid request type.' })
  @IsNotEmpty({ message: 'Request type cannot be empty.' })
  requestType: RequestTypeEnum;
}
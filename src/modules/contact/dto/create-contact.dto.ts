import {
  IsEmail,
  IsNotEmpty,
  IsString,
  MaxLength,
  IsEnum,
  IsNumberString,
  IsUrl,
  IsInt,
  Min,
  ValidateIf,
} from 'class-validator';
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

  @IsEnum(RequestTypeEnum, { message: 'Invalid request type.' })
  @IsNotEmpty({ message: 'Request type cannot be empty.' })
  requestType: RequestTypeEnum;

  @IsString()
  @IsNotEmpty({ message: 'University Name cannot be empty.' })
  @MaxLength(255, { message: 'University name cannot exceed 255 characters.' })
  universityName: string;

  @IsString()
  @IsNotEmpty({ message: 'Phone Number cannot be empty.' })
  @IsNumberString({}, { message: 'Please provide a valid phone number.' })
  phoneNumber: string;

  @ValidateIf((o) => o.requestType === RequestTypeEnum.NEW_UNIVERSITY)
  @IsString()
  @IsNotEmpty({ message: 'Country cannot be empty for New University requests.' })
  @MaxLength(200, { message: 'Country cannot exceed 200 characters.' })
  country?: string;

  @ValidateIf((o) => o.requestType === RequestTypeEnum.NEW_UNIVERSITY)
  @IsString()
  @IsNotEmpty({ message: 'Location cannot be empty for New University requests.' })
  @MaxLength(255, { message: 'Location cannot exceed 255 characters.' })
  location?: string;

  @ValidateIf((o) => o.requestType === RequestTypeEnum.NEW_UNIVERSITY)
  @IsString()
  @IsNotEmpty({ message: 'University Type cannot be empty for New University requests.' })
  @MaxLength(100, { message: 'University type cannot exceed 100 characters.' })
  type?: string;

  @ValidateIf((o) => o.requestType === RequestTypeEnum.NEW_UNIVERSITY)
  @IsString()
  @IsNotEmpty({ message: 'University Email cannot be empty for New University requests.' })
  @IsEmail({}, { message: 'Please provide a valid university email address for New University requests.' })
  universityEmail?: string;

  @ValidateIf((o) => o.requestType === RequestTypeEnum.NEW_UNIVERSITY)
  @IsString()
  @IsNotEmpty({ message: 'Website cannot be empty for New University requests.' })
  @IsUrl({}, { message: 'Please provide a valid website URL for New University requests.' })
  website?: string;

  @ValidateIf((o) => o.requestType === RequestTypeEnum.NEW_UNIVERSITY)
  @IsString()
  @IsNotEmpty({ message: 'Broad Field of Study cannot be empty for New University requests.' })
  @MaxLength(255, { message: 'Broad field of study cannot exceed 255 characters.' })
  broadFieldOfStudy?: string;

  @ValidateIf((o) => o.requestType === RequestTypeEnum.NEW_UNIVERSITY)
  @IsString()
  @IsNotEmpty({ message: 'Specific Field of Study cannot be empty for New University requests.' })
  @MaxLength(255, { message: 'Specific field of study cannot exceed 255 characters.' })
  specificFieldOfStudy?: string;

  @ValidateIf((o) => o.requestType === RequestTypeEnum.NEW_UNIVERSITY && o.rank !== undefined && o.rank !== null)
  @IsInt({ message: 'Rank must be an integer for New University requests.' })
  @Min(1, { message: 'Rank must be a positive number for New University requests.' })
  rank?: number;

  @ValidateIf(
    (o) =>
      o.requestType === RequestTypeEnum.NEW_UNIVERSITY &&
      o.numberOfStudents !== undefined &&
      o.numberOfStudents !== null
  )
  @IsInt({ message: 'Number of students must be an integer for New University requests.' })
  @Min(0, { message: 'Number of students cannot be negative for New University requests.' })
  numberOfStudents?: number;
}

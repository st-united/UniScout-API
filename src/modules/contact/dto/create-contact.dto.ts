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
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'; // Import ApiProperty and ApiPropertyOptional
import { RequestTypeEnum } from '@Constant/enums';

export class CreateContactDto {
  @ApiProperty({ description: 'Name of the contact person', maxLength: 100 })
  @IsString()
  @IsNotEmpty({ message: 'Name cannot be empty.' })
  @MaxLength(100, { message: 'Name cannot exceed 100 characters.' })
  name: string;

  @ApiProperty({ description: 'Email address of the contact person' })
  @IsEmail({}, { message: 'Please provide a valid email address.' })
  @IsNotEmpty({ message: 'Email cannot be empty.' })
  email: string;

  @ApiProperty({ description: 'Message content', maxLength: 1000 })
  @IsString()
  @IsNotEmpty({ message: 'Message cannot be empty.' })
  @MaxLength(1000, { message: 'Message cannot exceed 1000 characters.' })
  message: string;

  @ApiProperty({
    description: 'Type of request',
    enum: RequestTypeEnum,
    enumName: 'RequestTypeEnum',
  })
  @IsEnum(RequestTypeEnum, { message: 'Invalid request type.' })
  @IsNotEmpty({ message: 'Request type cannot be empty.' })
  requestType: RequestTypeEnum;

  @ApiProperty({ description: 'Name of the university', maxLength: 255 })
  @IsString()
  @IsNotEmpty({ message: 'University Name cannot be empty.' })
  @MaxLength(255, { message: 'University name cannot exceed 255 characters.' })
  universityName: string;

  @ApiProperty({ description: 'Phone number' })
  @IsString()
  @IsNotEmpty({ message: 'Phone Number cannot be empty.' })
  @IsNumberString({}, { message: 'Please provide a valid phone number.' })
  phoneNumber: string;

  @ApiPropertyOptional({
    description: 'Country (required for NEW_UNIVERSITY request type)',
    maxLength: 200,
  })
  @ValidateIf((o) => o.requestType === RequestTypeEnum.NEW_UNIVERSITY)
  @IsString()
  @IsNotEmpty({ message: 'Country cannot be empty for New University requests.' })
  @MaxLength(200, { message: 'Country cannot exceed 200 characters.' })
  country?: string;

  @ApiPropertyOptional({
    description: 'Location (required for NEW_UNIVERSITY request type)',
    maxLength: 255,
  })
  @ValidateIf((o) => o.requestType === RequestTypeEnum.NEW_UNIVERSITY)
  @IsString()
  @IsNotEmpty({ message: 'Location cannot be empty for New University requests.' })
  @MaxLength(255, { message: 'Location cannot exceed 255 characters.' })
  location?: string;

  @ApiPropertyOptional({
    description: 'University Type (required for NEW_UNIVERSITY request type)',
    maxLength: 100,
  })
  @ValidateIf((o) => o.requestType === RequestTypeEnum.NEW_UNIVERSITY)
  @IsString()
  @IsNotEmpty({ message: 'University Type cannot be empty for New University requests.' })
  @MaxLength(100, { message: 'University type cannot exceed 100 characters.' })
  type?: string;

  @ApiPropertyOptional({
    description: 'University Email (required for NEW_UNIVERSITY request type)',
  })
  @ValidateIf((o) => o.requestType === RequestTypeEnum.NEW_UNIVERSITY)
  @IsString()
  @IsNotEmpty({ message: 'University Email cannot be empty for New University requests.' })
  @IsEmail({}, { message: 'Please provide a valid university email address for New University requests.' })
  universityEmail?: string;

  @ApiPropertyOptional({
    description: 'Website URL (required for NEW_UNIVERSITY request type)',
  })
  @ValidateIf((o) => o.requestType === RequestTypeEnum.NEW_UNIVERSITY)
  @IsString()
  @IsNotEmpty({ message: 'Website cannot be empty for New University requests.' })
  @IsUrl({}, { message: 'Please provide a valid website URL for New University requests.' })
  website?: string;

  @ApiPropertyOptional({
    description: 'Broad Field of Study (required for NEW_UNIVERSITY request type)',
    maxLength: 255,
  })
  @ValidateIf((o) => o.requestType === RequestTypeEnum.NEW_UNIVERSITY)
  @IsString()
  @IsNotEmpty({ message: 'Broad Field of Study cannot be empty for New University requests.' })
  @MaxLength(255, { message: 'Broad field of study cannot exceed 255 characters.' })
  broadFieldOfStudy?: string;

  @ApiPropertyOptional({
    description: 'Specific Field of Study (required for NEW_UNIVERSITY request type)',
    maxLength: 255,
  })
  @ValidateIf((o) => o.requestType === RequestTypeEnum.NEW_UNIVERSITY)
  @IsString()
  @IsNotEmpty({ message: 'Specific Field of Study cannot be empty for New University requests.' })
  @MaxLength(255, { message: 'Specific field of study cannot exceed 255 characters.' })
  specificFieldOfStudy?: string;

  @ApiPropertyOptional({
    description: 'Rank of the university (positive integer)',
    type: Number,
  })
  @ValidateIf((o) => o.requestType === RequestTypeEnum.NEW_UNIVERSITY && o.rank !== undefined && o.rank !== null)
  @IsInt({ message: 'Rank must be an integer for New University requests.' })
  @Min(1, { message: 'Rank must be a positive number for New University requests.' })
  rank?: number;

  @ApiPropertyOptional({
    description: 'Number of students (non-negative integer)',
    type: Number,
  })
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

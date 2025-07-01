import {
  IsOptional,
  IsNotEmpty,
  IsString,
  IsNumber,
  IsEmail,
  IsIn,
  IsInt,
  IsBoolean,
  Matches,
  Min,
  Max,
  Validate,
  IsArray,
  ValidateIf,
} from 'class-validator';
import { Type } from 'class-transformer';
import { IsCountryValidConstraint, IsSubjectValid } from '../validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { UniversityTypeEnum } from './get-university.dto';

export class UpdateUniversityDto {
  @IsOptional()
  @IsNotEmpty({ message: 'University name cannot be empty' })
  @IsString()
  university?: string;

  @IsOptional()
  @IsNotEmpty({ message: 'Abbreviation cannot be empty' })
  @IsString()
  abbreviation?: string;

  @IsOptional()
  @IsNotEmpty({ message: 'Latitude cannot be empty' })
  @Type(() => Number)
  @IsNumber({}, { message: 'Latitude must be a number' })
  latitude?: number;

  @IsOptional()
  @IsNotEmpty({ message: 'Longitude cannot be empty' })
  @Type(() => Number)
  @IsNumber({}, { message: 'Longitude must be a number' })
  longitude?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Rank must be a number' })
  @Min(1)
  rank?: number;

  @ApiPropertyOptional({ description: 'Type of university', enum: UniversityTypeEnum })
  @IsOptional()
  @IsString()
  @IsIn(Object.values(UniversityTypeEnum), { message: 'Invalid university type selected' })
  type?: UniversityTypeEnum;

  @IsOptional()
  @IsString()
  @Validate(IsCountryValidConstraint)
  country?: string;

  @IsOptional()
  @IsNotEmpty({ message: 'Location cannot be empty' })
  @IsString()
  location?: string;

  @IsOptional()
  @IsNotEmpty({ message: 'Student population cannot be empty' })
  @Type(() => Number)
  @IsInt({ message: 'Student population must be a number' })
  @Min(0)
  studentPopulation?: number;

  @IsOptional()
  @IsNotEmpty({ message: 'Year cannot be empty' })
  @Type(() => Number)
  @IsInt()
  @Min(1000)
  @Max(new Date().getFullYear())
  year?: number;

  @IsOptional()
  @IsNotEmpty({ message: 'Contact cannot be empty' })
  @IsString()
  @Matches(/^\d{1,3}\d{6,14}$/, {
    message:
      'Invalid contact format. Must start with a country code (1–3 digits), followed by contact number (e.g., 84123456789).',
  })
  contact?: string;

  @IsOptional()
  @IsNotEmpty({ message: 'Email cannot be empty' })
  @IsEmail({}, { message: 'Please enter a valid email address' })
  email?: string;

  @IsOptional()
  @IsNotEmpty({ message: 'Website cannot be empty' })
  @Matches(/^https?:\/\//, {
    message: 'Website must start with http:// or https://',
  })
  website?: string;

  @IsOptional()
  @IsString()
  strength?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  exchange?: boolean;

  @ApiPropertyOptional({
    description: 'List of academic field names offered by the university',
    type: [String],
  })
  @IsOptional()
  @IsArray({ message: 'Academic fields must be an array' })
  @IsString({ each: true, message: 'Each academic field must be a string' })
  academicFields?: string[];

  @ApiPropertyOptional({
    description: 'Details for "others" academic field, if selected',
  })
  @ValidateIf((o) => o.academicFields && o.academicFields.includes('others'))
  @IsOptional()
  @IsString()
  otherAcademicFieldsDetail?: string;

  @ApiPropertyOptional({
    description: 'List of subject names offered by the university. Must align with selected academic fields.',
    type: [String],
  })
  @IsOptional()
  @IsArray({ message: 'Subject names must be an array' })
  @IsString({ each: true, message: 'Each subject name must be a string' })
  @ValidateIf((o) => o.academicFields !== undefined || o.subjectNames !== undefined)
  @Validate(IsSubjectValid, {
    message:
      'Selected subjects must be valid for the chosen academic fields, and each academic field must have at least one associated subject.',
  })
  subjectNames?: string[];
}

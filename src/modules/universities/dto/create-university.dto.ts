import {
  IsNotEmpty,
  IsString,
  IsNumber,
  IsEmail,
  IsOptional,
  IsIn,
  IsInt,
  IsBoolean,
  Matches,
  Min,
  Max,
  Validate,
  IsArray,
} from 'class-validator';
import { Type } from 'class-transformer';
import { IsCountryValidConstraint } from '../validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UniversityTypeEnum } from './get-university.dto';

export class CreateUniversityDto {
  @ApiProperty({ description: 'Full name of university' })
  @IsNotEmpty({ message: 'University name is required' })
  @IsString()
  university: string;

  @ApiProperty({ description: 'Abbreviation of university' })
  @IsNotEmpty({ message: 'Abbreviated name is required' })
  @IsString()
  abbreviation: string;

  @ApiPropertyOptional({ description: 'Geographical latitude of university' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'Latitude must be a number' })
  latitude?: number;

  @ApiPropertyOptional({ description: 'Geographical longitude of university' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'Longitude must be a number' })
  longitude?: number;

  @ApiPropertyOptional({ description: 'University rank' })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Rank must be an integer' })
  @Min(1, { message: 'Rank must be a positive number' })
  rank?: number;

  @ApiPropertyOptional({ description: 'Logo URL of university' })
  @IsOptional()
  @IsString({ message: 'Logo must be a string (URL)' })
  logo?: string;

  @ApiProperty({ description: 'Type of university', enum: UniversityTypeEnum })
  @IsNotEmpty({ message: 'University type is required' })
  @IsString()
  @IsIn(Object.values(UniversityTypeEnum), { message: 'Invalid university type selected' })
  type: UniversityTypeEnum;

  @ApiProperty({ description: 'Country of university' })
  @IsNotEmpty({ message: 'Country is required' })
  @IsString()
  @Validate(IsCountryValidConstraint)
  country: string;

  @ApiPropertyOptional({ description: 'Location or city name' })
  @IsOptional()
  @IsString()
  location?: string;

  @ApiProperty({ description: 'Student population' })
  @IsNotEmpty({ message: 'Student population is required' })
  @IsInt({ message: 'Student population must be an integer' })
  @Min(0, { message: 'Student population cannot be negative' })
  @Type(() => Number)
  studentPopulation: number;

  @ApiProperty({ description: 'Year of establishment' })
  @IsNotEmpty({ message: 'Year is required' })
  @IsInt({ message: 'Year must be an integer' })
  @Min(1000, { message: 'Year must be a valid year' })
  @Max(new Date().getFullYear(), { message: 'Year cannot be in the future' })
  @Type(() => Number)
  year: number;

  @ApiProperty({ description: 'Contact number (e.g., 84 123456789)' })
  @IsNotEmpty({ message: 'Contact is required' })
  @IsString()
  @Matches(/^\d{1,3}\d{6,14}$/, {
    message:
      'Invalid contact format. Must start with a country code (1-3 digits), followed by contact number (e.g., 84123456789).',
  })
  contact: string;

  @ApiProperty({ description: 'Email address' })
  @IsNotEmpty({ message: 'Email is required' })
  @IsEmail({}, { message: 'Invalid email format' })
  email: string;

  @ApiProperty({ description: 'Website URL' })
  @IsNotEmpty({ message: 'Website is required' })
  @Matches(/^https?:\/\/(?!-)(?:[a-zA-Z0-9-]{1,63}(?<!-)\.)+[a-zA-Z]{2,63}(?<!\.)$/, {
    message:
      'Invalid website format. Must be a valid domain (e.g., example.com), contain at least one dot, not contain special characters (except hyphens), and not start/end with a hyphen or dot.',
  })
  website: string;

  @ApiPropertyOptional({ description: 'Key strengths or notable aspects of the university' })
  @IsOptional()
  @IsString()
  strength?: string;

  @ApiPropertyOptional({ description: 'General description of the university' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'Whether or not the university offers exchange programs within Asia' })
  @IsNotEmpty({ message: 'Exchange is required' })
  @IsBoolean()
  @Type(() => Boolean)
  exchange?: boolean;

  @ApiPropertyOptional({ description: 'Path to subjects Excel file from contact submission' })
  @IsNotEmpty()
  @IsString()
  subjectsExcelFilePath?: string;
}

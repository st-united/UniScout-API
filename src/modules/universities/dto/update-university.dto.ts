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
import { Transform, Type } from 'class-transformer';
import { IsCountryValidConstraint } from '../validator';
import { ApiHideProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UniversityTypeEnum } from './get-university.dto';

export class UpdateUniversityDto {
  @ApiPropertyOptional({ description: 'Full name of university' })
  @IsOptional()
  @IsNotEmpty({ message: 'University name cannot be empty' })
  @IsString()
  university?: string;

  @ApiPropertyOptional({ description: 'Abbreviation of university' })
  @IsOptional()
  @IsNotEmpty({ message: 'Abbreviation cannot be empty' })
  @IsString()
  abbreviation?: string;

  @ApiPropertyOptional({ description: 'Geographical latitude of university' })
  @IsOptional()
  @IsNotEmpty({ message: 'Latitude cannot be empty' })
  @Type(() => Number)
  @IsNumber({}, { message: 'Latitude must be a number' })
  latitude?: number;

  @ApiPropertyOptional({ description: 'Geographical longitude of university' })
  @IsOptional()
  @IsNotEmpty({ message: 'Longitude cannot be empty' })
  @Type(() => Number)
  @IsNumber({}, { message: 'Longitude must be a number' })
  longitude?: number;

  @ApiPropertyOptional({ description: 'University rank' })
  @IsOptional()
  @Transform(({ value }) => {
    const num = Number(value);
    if (value === '' || value === null || value === undefined || isNaN(num) || num === 0) {
      return null;
    }
    return num;
  })
  @IsInt({ message: 'Rank must be an integer' })
  rank?: number;

  @ApiHideProperty()
  @ApiPropertyOptional({ description: 'Logo file path' })
  @IsOptional()
  @IsString()
  logo?: string | null;

  @ApiPropertyOptional({ description: 'Type of university', enum: UniversityTypeEnum })
  @IsOptional()
  @IsString()
  @IsIn(Object.values(UniversityTypeEnum), { message: 'Invalid university type selected' })
  type?: UniversityTypeEnum;

  @ApiPropertyOptional({ description: 'Country of the university' })
  @IsOptional()
  @IsString()
  @Validate(IsCountryValidConstraint)
  country?: string;

  @ApiPropertyOptional({ description: 'Location of the university' })
  @IsOptional()
  @IsNotEmpty({ message: 'Location cannot be empty' })
  @IsString()
  location?: string;

  @ApiPropertyOptional({ description: 'Student population' })
  @IsOptional()
  @IsNotEmpty({ message: 'Student population cannot be empty' })
  @Type(() => Number)
  @IsInt({ message: 'Student population must be a number' })
  @Min(0)
  studentPopulation?: number;

  @ApiPropertyOptional({ description: 'Year of establishment' })
  @IsOptional()
  @IsNotEmpty({ message: 'Year cannot be empty' })
  @Type(() => Number)
  @IsInt()
  @Min(1000)
  @Max(new Date().getFullYear())
  year?: number;

  @ApiPropertyOptional({ description: 'Contact number' })
  @IsOptional()
  @IsNotEmpty({ message: 'Contact cannot be empty' })
  @IsString()
  @Matches(/^\d{1,3}\d{6,14}$/, {
    message:
      'Invalid contact format. Must start with a country code (1–3 digits), followed by contact number (e.g., 84123456789).',
  })
  contact?: string;

  @ApiPropertyOptional({ description: 'Email address' })
  @IsOptional()
  @IsNotEmpty({ message: 'Email cannot be empty' })
  @IsEmail({}, { message: 'Please enter a valid email address' })
  email?: string;

  @ApiPropertyOptional({ description: 'Website URL' })
  @IsOptional()
  @IsNotEmpty({ message: 'Website cannot be empty' })
  @Matches(/^https?:\/\//, {
    message: 'Website must start with http:// or https://',
  })
  website?: string;

  @ApiPropertyOptional({ description: 'University strength' })
  @IsOptional()
  @IsString()
  strength?: string;

  @ApiPropertyOptional({ description: 'University description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Whether the university offers exchange programs within Asia' })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  exchange?: boolean;

  @ApiHideProperty()
  subjectsExcelFilePath?: string;
}

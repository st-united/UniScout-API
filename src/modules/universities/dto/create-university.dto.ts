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
import { Transform, Type } from 'class-transformer';
import { IsCountryValidConstraint } from '@UniversitiesModule/validator';

export class CreateUniversityDto {
  @IsNotEmpty({ message: 'University name is required' })
  @IsString()
  university: string;

  @IsNotEmpty()
  @Type(() => Number)
  @IsNumber({}, { message: 'Latitude must be a number' })
  latitude?: number;

  @IsNotEmpty()
  @Type(() => Number)
  @IsNumber({}, { message: 'Longitude must be a number' })
  longitude?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Rank must be a number' })
  rank: number;

  @IsNotEmpty({ message: 'Type is required' })
  @IsIn(['public', 'private'], { message: 'Type must be public or private' })
  type: 'public' | 'private';

  @IsOptional()
  @Transform(({ value }) => (Array.isArray(value) ? value : [value]))
  @IsArray()
  @IsString({ each: true })
  @Validate(IsCountryValidConstraint, {
    message: 'Country is not valid or supported',
  })
  country: string;

  @IsNotEmpty({ message: 'Location is required' })
  @IsString()
  location: string;

  @IsNotEmpty({ message: 'Size is required' })
  @Type(() => Number)
  @IsInt({ message: 'Size must be a number' })
  studentPopulation: number;

  @IsNotEmpty({ message: 'Year founded is required' })
  @Type(() => Number)
  @IsInt({ message: 'Year founded must be a number' })
  @Min(1000, { message: 'Year founded must be at least 1000' })
  @Max(9999, { message: 'Year founded must be a valid 4-digit year' })
  year: number;

  @IsNotEmpty({ message: 'Phone is required' })
  @IsString()
  contact: string;

  @IsNotEmpty({ message: 'Email is required' })
  @IsEmail({}, { message: 'Please enter a valid email address' })
  email: string;

  @IsNotEmpty({ message: 'Website is required' })
  @Matches(/^https?:\/\//, {
    message: 'Website must start with http:// or https://',
  })
  website: string;

  @IsOptional()
  @IsString()
  strength?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  exchange?: boolean;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  agriculturalFoodScience?: boolean;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  artsDesign?: boolean;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  economicsBusinessManagement?: boolean;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  engineering?: boolean;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  lawPoliticalScience?: boolean;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  medicinePharmacyHealthSciences?: boolean;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  physicalScience?: boolean;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  socialSciencesHumanities?: boolean;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  sportsPhysicalEducation?: boolean;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  technology?: boolean;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  theology?: boolean;
}

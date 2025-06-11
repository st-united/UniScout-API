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
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { IsCountryValidConstraint } from '@UniversitiesModule/validator';

export class UpdateUniversityDto {
  @IsOptional()
  @IsNotEmpty({ message: 'University name cannot be empty' })
  @IsString()
  university?: string;

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

  @IsOptional()
  @IsNotEmpty({ message: 'Type cannot be empty' })
  @IsIn(['public', 'private'], { message: 'Type must be public or private' })
  type?: 'public' | 'private';

  @IsOptional()
  @Transform(({ value }) => (Array.isArray(value) ? value : [value]))
  @IsArray()
  @IsString({ each: true })
  @Validate(IsCountryValidConstraint)
  country?: string[];

  @IsOptional()
  @IsNotEmpty({ message: 'Location cannot be empty' })
  @IsString()
  location?: string;

  @IsOptional()
  @IsNotEmpty({ message: 'Student cannot be empty' })
  @Type(() => Number)
  @IsInt({ message: 'Student must be a number' })
  @Min(0)
  studentPopulation?: number;

  @IsOptional()
  @IsNotEmpty({ message: 'Year cannot be empty' })
  @Type(() => Number)
  @IsInt()
  @Min(1000)
  @Max(9999)
  year?: number;

  @IsOptional()
  @IsNotEmpty({ message: 'Contact cannot be empty' })
  @IsString()
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

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  agriculturalFoodScience?: boolean;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  artsDesign?: boolean;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  economicsBusinessManagement?: boolean;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  lawPoliticalScience?: boolean;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  medicinePharmacyHealthSciences?: boolean;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  scienceEngineering?: boolean;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  socialSciencesHumanities?: boolean;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  sportsPhysicalEducation?: boolean;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  technology?: boolean;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  others?: boolean;
}

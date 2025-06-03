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
} from 'class-validator';
import { Type } from 'class-transformer';
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

  @IsNotEmpty({ message: 'Country is required' })
  @IsString()
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
  student: number;

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
  agricultural_food_science?: boolean;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  arts_design?: boolean;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  economics_business_management?: boolean;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  engineering?: boolean;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  law_political_science?: boolean;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  medicine_pharmacy_health_sciences?: boolean;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  physical_science?: boolean;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  social_sciences_humanities?: boolean;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  sports_physical_education?: boolean;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  technology?: boolean;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  theology?: boolean;
}

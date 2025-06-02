import { IsOptional, IsNotEmpty, IsString, IsEmail, IsIn, IsInt, IsBoolean, Matches, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { CountryEnum } from './get-university.dto';

export class UpdateUniversityDto {
  @IsOptional()
  @IsNotEmpty({ message: 'University name cannot be empty' })
  @IsString()
  university?: string;

  @IsOptional()
  @IsNotEmpty({ message: 'Ranking cannot be empty' })
  @Type(() => Number)
  @IsInt({ message: 'Ranking must be a number' })
  @Min(1)
  rank?: number;

  @IsOptional()
  @IsNotEmpty({ message: 'Type cannot be empty' })
  @IsIn(['public', 'private'], { message: 'Type must be public or private' })
  type?: 'public' | 'private';

  @IsOptional()
  @IsNotEmpty({ message: 'Country cannot be empty' })
  @IsIn(Object.values(CountryEnum), { message: 'Invalid country' })
  country?: CountryEnum;

  @IsOptional()
  @IsNotEmpty({ message: 'Location cannot be empty' })
  @IsString()
  location?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  student?: number;

  @IsOptional()
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
  agricultural_food_science?: boolean;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  arts_design?: boolean;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  economics_business_management?: boolean;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  engineering?: boolean;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  law_political_science?: boolean;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  medicine_pharmacy_health_sciences?: boolean;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  physical_science?: boolean;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  social_sciences_humanities?: boolean;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  sports_physical_education?: boolean;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  technology?: boolean;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  theology?: boolean;
}

import { IsOptional, IsString, IsInt, IsBoolean, IsUrl, IsEmail, Min } from 'class-validator';

export class UpdateUniversityDto {
  @IsOptional()
  @IsString()
  university?: string;

  @IsOptional()
  @IsString()
  logo?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  rank?: number;

  @IsOptional()
  @IsString()
  type?: string;

  @IsOptional()
  @IsString()
  country?: string;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  student?: number;

  @IsOptional()
  @IsInt()
  @Min(1000)
  year?: number;

  @IsOptional()
  @IsString()
  contact?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsUrl()
  website?: string;

  @IsOptional()
  @IsString()
  strength?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  exchange?: boolean;

  @IsOptional()
  @IsBoolean()
  agricultural_food_science?: boolean;

  @IsOptional()
  @IsBoolean()
  arts_design?: boolean;

  @IsOptional()
  @IsBoolean()
  economics_business_management?: boolean;

  @IsOptional()
  @IsBoolean()
  engineering?: boolean;

  @IsOptional()
  @IsBoolean()
  law_political_science?: boolean;

  @IsOptional()
  @IsBoolean()
  medicine_pharmacy_health_sciences?: boolean;

  @IsOptional()
  @IsBoolean()
  physical_science?: boolean;

  @IsOptional()
  @IsBoolean()
  social_sciences_humanities?: boolean;

  @IsOptional()
  @IsBoolean()
  sports_physical_education?: boolean;

  @IsOptional()
  @IsBoolean()
  technology?: boolean;

  @IsOptional()
  @IsBoolean()
  theology?: boolean;
}

import { IsString, IsOptional, IsBoolean, IsInt } from 'class-validator';

export class CreateUniversityDto {
  @IsString()
  university: string;

  @IsString()
  @IsOptional()
  logo?: string;

  @IsInt()
  @IsOptional()
  rank?: number;

  @IsString()
  @IsOptional()
  type?: string;

  @IsString()
  @IsOptional()
  country?: string;

  @IsString()
  @IsOptional()
  location?: string;

  @IsInt()
  @IsOptional()
  student?: number;

  @IsInt()
  @IsOptional()
  year?: number;

  @IsString()
  @IsOptional()
  contact?: string;

  @IsString()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  website?: string;

  @IsString()
  @IsOptional()
  strength?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsBoolean()
  @IsOptional()
  agricultural_food_science?: boolean;

  @IsBoolean()
  @IsOptional()
  arts_design?: boolean;

  @IsBoolean()
  @IsOptional()
  economics_business_management?: boolean;

  @IsBoolean()
  @IsOptional()
  engineering?: boolean;

  @IsBoolean()
  @IsOptional()
  law_political_science?: boolean;

  @IsBoolean()
  @IsOptional()
  medicine_pharmacy_health_sciences?: boolean;

  @IsBoolean()
  @IsOptional()
  physical_science?: boolean;

  @IsBoolean()
  @IsOptional()
  social_sciences_humanities?: boolean;

  @IsBoolean()
  @IsOptional()
  sports_physical_education?: boolean;

  @IsBoolean()
  @IsOptional()
  technology?: boolean;
}

export class CreateJapKoreaUniversityDto extends CreateUniversityDto {
  @IsBoolean()
  @IsOptional()
  exchange?: boolean;
}

export class CreateAustraliaUniversityDto extends CreateUniversityDto {
  @IsBoolean()
  @IsOptional()
  theology?: boolean;
}

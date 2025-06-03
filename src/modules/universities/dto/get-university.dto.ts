import {
  IsOptional,
  IsString,
  IsNumber,
  IsEnum,
  IsInt,
  Min,
  Validate,
  ValidateNested,
  IsBoolean,
} from 'class-validator';
import { Type } from 'class-transformer';
import { IsCountryValidConstraint } from '@UniversitiesModule/validator';

export enum UniversitySizeEnum {
  SMALL = 'small',
  MEDIUM = 'medium',
  LARGE = 'large',
  MEGA_LARGE = 'mega large',
}

export enum UniversityTypeEnum {
  PUBLIC = 'public',
  PRIVATE = 'private',
}

export class FieldsFilterDto {
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

export class GetUniversityDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  latitude?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  longitude?: number;

  @IsOptional()
  @IsInt()
  rank?: number;

  @IsOptional()
  @IsEnum(UniversityTypeEnum)
  type?: UniversityTypeEnum;

  @IsOptional()
  @IsString()
  @Validate(IsCountryValidConstraint)
  country?: string;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  student?: number;

  @IsOptional()
  @IsEnum(UniversitySizeEnum)
  size?: UniversitySizeEnum;

  @IsOptional()
  @ValidateNested()
  @Type(() => FieldsFilterDto)
  fields?: FieldsFilterDto;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page = 1;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  limit = 16;

  @IsOptional()
  @IsEnum(['ASC', 'DESC'], { message: 'sortOrder must be ASC or DESC' })
  sortOrder?: 'ASC' | 'DESC' = 'ASC';
}

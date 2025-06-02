import { IsOptional, IsString, IsEnum, IsInt, Min, ValidateNested, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';
export enum CountryEnum {
  AUSTRALIA = 'Australia',
  INDIA = 'India',
  JAPAN = 'Japan',
  KOREA = 'Korea',
  USA = 'USA',
  VIETNAM = 'Vietnam',
}
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
class FieldsFilterDto {
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
  @IsInt()
  rank?: number;
  @IsOptional()
  @IsEnum(UniversityTypeEnum)
  type?: UniversityTypeEnum;
  @IsOptional()
  @IsEnum(CountryEnum, {
    message: `Country must be one of: ${Object.values(CountryEnum).join(', ')}`,
  })
  country?: CountryEnum;
  @IsOptional()
  @IsString()
  location?: string;
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
  page: number = 1;
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  limit: number = 16;
  @IsOptional()
  @IsEnum(['ASC', 'DESC'], { message: 'sortOrder must be ASC or DESC' })
  sortOrder?: 'ASC' | 'DESC' = 'ASC';
}
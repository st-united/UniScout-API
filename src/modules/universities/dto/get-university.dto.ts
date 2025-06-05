import {
  IsOptional,
  IsString,
  IsNumber,
  IsEnum,
  IsInt,
  Min,
  ValidateNested,
  IsBoolean,
  IsArray,
  Validate,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
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

export enum SortOrderEnum {
  ASC = 'ASC',
  DESC = 'DESC',
}

export class FieldsFilterDto {
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
  @Type(() => Number)
  minRank?: number;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  maxRank?: number;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  rank?: number;

  @IsOptional()
  @IsEnum(UniversityTypeEnum)
  type?: UniversityTypeEnum;

  @IsOptional()
  @Transform(({ value }) => (Array.isArray(value) ? value : [value]))
  @IsArray()
  @Validate(IsCountryValidConstraint)
  country?: string[];

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  studentPopulation?: number;

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
  limit = 12;

  @IsOptional()
  @IsEnum(SortOrderEnum, { message: 'sortOrder must be ASC or DESC' })
  sortOrder?: SortOrderEnum = SortOrderEnum.ASC;
}

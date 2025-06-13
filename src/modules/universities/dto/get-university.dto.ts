import {
  IsOptional,
  IsString,
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
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Logger } from '@nestjs/common';

export enum UniversitySizeEnum {
  SMALL = 'small',
  MEDIUM = 'medium',
  LARGE = 'large',
  EXTRA_LARGE = 'extra large',
}

export enum UniversityTypeEnum {
  PUBLIC = 'public',
  PRIVATE = 'private',
}

export enum SortOrderEnum {
  ASC = 'ASC',
  DESC = 'DESC',
}

export enum SortByEnum {
  RANK = 'rank',
}

export class GetUniversityDto {
  @ApiPropertyOptional({ description: 'Generic search term for university name, location, or fields' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Minimum university ranking', type: Number })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  minRank?: number;

  @ApiPropertyOptional({ description: 'Maximum university ranking', type: Number })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  maxRank?: number;

  @ApiPropertyOptional({ description: 'University rank', type: Number })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  rank?: number;

  @ApiPropertyOptional({ description: 'Type of university' })
  @IsOptional()
  @Transform(({ value }) => (Array.isArray(value) ? value : [value]))
  @IsArray()
  @IsEnum(UniversityTypeEnum, { each: true }) // Added explicit enum validation
  type?: string[];

  @ApiPropertyOptional({
    description: 'Country or list of countries',
    type: [String],
  })
  @IsOptional()
  @Transform(({ value }) => (Array.isArray(value) ? value : [value]))
  @IsArray()
  @Validate(IsCountryValidConstraint)
  country?: string[];

  @ApiPropertyOptional({ description: 'Location or city name' })
  @IsOptional()
  @IsString()
  location?: string;

  @ApiPropertyOptional({ description: 'Size of university' })
  @Transform(({ value }) => (Array.isArray(value) ? value : [value]))
  @IsOptional()
  @IsArray()
  @IsEnum(UniversitySizeEnum, { each: true }) // Added explicit enum validation
  size?: string[];

  @ApiPropertyOptional({
    description: 'Array of academic field names to filter by',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Transform(({ value }) => (Array.isArray(value) ? value : [value]))
  fieldNames?: string[];

  @ApiPropertyOptional({ description: 'Page number', type: Number, default: 1, minimum: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page = 1;

  @ApiPropertyOptional({ description: 'Number of items per page', type: Number, default: 16, minimum: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  limit = 16;

  @ApiPropertyOptional({
    description: 'Column to sort by',
    enum: SortByEnum,
  })
  @IsOptional()
  @IsEnum(SortByEnum)
  sortBy?: SortByEnum = SortByEnum.RANK;

  @ApiPropertyOptional({
    enum: SortOrderEnum,
    description: 'Sort order',
    default: SortOrderEnum.ASC,
  })
  @IsOptional()
  @IsEnum(SortOrderEnum, { message: 'sortOrder must be ASC or DESC' })
  sortOrder?: SortOrderEnum = SortOrderEnum.ASC;

  @ApiPropertyOptional({ description: 'Filter by Agricultural & Food Science programs' })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  agriculturalFoodScience?: boolean;

  @ApiPropertyOptional({ description: 'Filter by Arts & Design programs' })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  artsDesign?: boolean;

  @ApiPropertyOptional({ description: 'Filter by Economics & Business Management programs' })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  economicsBusinessManagement?: boolean;

  @ApiPropertyOptional({ description: 'Filter by Engineering programs' })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  engineering?: boolean;

  @ApiPropertyOptional({ description: 'Filter by Law & Political Science programs' })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  lawPoliticalScience?: boolean;

  @ApiPropertyOptional({ description: 'Filter by Medicine, Pharmacy & Health Sciences programs' })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  medicinePharmacyHealthSciences?: boolean;

  @ApiPropertyOptional({ description: 'Filter by Physical Science programs' })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  physicalScience?: boolean;

  @ApiPropertyOptional({ description: 'Filter by Social Sciences & Humanities programs' })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  socialSciencesHumanities?: boolean;

  @ApiPropertyOptional({ description: 'Filter by Sports & Physical Education programs' })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  sportsPhysicalEducation?: boolean;

  @ApiPropertyOptional({ description: 'Filter by Technology programs' })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  technology?: boolean;

  @ApiPropertyOptional({ description: 'Filter by Theology programs' })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  theology?: boolean;

  constructor() {
    const logger = new Logger(GetUniversityDto.name);
    logger.log('GetUniversityDto instantiated:', this);
  }
}

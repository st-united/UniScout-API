import { IsOptional, IsString, IsEnum, IsInt, Min, IsArray, Validate } from 'class-validator';
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

  constructor() {
    const logger = new Logger(GetUniversityDto.name);
    logger.log('GetUniversityDto instantiated:', this);
  }
}

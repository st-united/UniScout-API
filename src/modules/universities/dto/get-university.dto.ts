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
  MEGA_LARGE = 'mega large',
  UNKNOWN = 'unknown',
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
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  agriculturalFoodScience?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  artsDesign?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  economicsBusinessManagement?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  engineering?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  lawPoliticalScience?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  medicinePharmacyHealthSciences?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  physicalScience?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  socialSciencesHumanities?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  sportsPhysicalEducation?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  technology?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  theology?: boolean;

  constructor() {
    const logger = new Logger(FieldsFilterDto.name);
    logger.log('FieldsFilterDto instantiated:', this);
  }
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

  @ApiPropertyOptional({ description: 'Exact university rank', type: Number })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  rank?: number;

  @ApiPropertyOptional({ enum: UniversityTypeEnum, description: 'Type of university' })
  @IsOptional()
  @IsEnum(UniversityTypeEnum)
  type?: UniversityTypeEnum;

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

  @ApiPropertyOptional({ enum: UniversitySizeEnum, description: 'Size of university' })
  @IsOptional()
  @IsEnum(UniversitySizeEnum)
  size?: UniversitySizeEnum;

  @ApiPropertyOptional({
    description: 'Filter by fields of study',
    type: FieldsFilterDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => FieldsFilterDto)
  fields?: FieldsFilterDto;

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
    type: String,
    default: 'id',
  })
  @IsOptional()
  @IsString()
  sortBy?: string = 'id';

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

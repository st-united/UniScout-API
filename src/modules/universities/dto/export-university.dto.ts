import { IsOptional, IsEnum, IsArray, IsString, IsNumber, Min, Validate, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { FieldsFilterDto } from './get-university.dto';
import { IsCountryValidConstraint } from '@UniversitiesModule/validator';

export enum ExportFormat {
  CSV = 'csv',
  EXCEL = 'excel',
}

export class ExportUniversityDto {
  @IsOptional()
  @IsArray()
  @Validate(IsCountryValidConstraint)
  country?: string[];

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  minRank?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  maxRank?: number;

  @IsOptional()
  @IsString()
  type?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => FieldsFilterDto)
  fields?: FieldsFilterDto;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  columns?: string[];

  @IsEnum(ExportFormat)
  format: ExportFormat;
}

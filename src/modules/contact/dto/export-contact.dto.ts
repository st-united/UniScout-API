import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsEnum, IsArray } from 'class-validator';
import { RequestTypeEnum } from '@Constant/enums';
import { SubmissionStatusEnum } from '../entities';

export class ExportContactRequestDto {
  @ApiProperty({ required: false, type: [String], description: 'Fields to include in export' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  fields?: string[];

  @ApiProperty({ required: false, enum: RequestTypeEnum, description: 'Filter by request type' })
  @IsOptional()
  @IsEnum(RequestTypeEnum)
  requestType?: RequestTypeEnum;

  @ApiProperty({ required: false, enum: SubmissionStatusEnum, description: 'Filter by status' })
  @IsOptional()
  @IsEnum(SubmissionStatusEnum)
  status?: SubmissionStatusEnum;

  @ApiProperty({ required: false, description: 'Filter by country' })
  @IsOptional()
  @IsString()
  country?: string;

  @ApiProperty({ required: false, description: 'Search in universityName/abbreviation' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiProperty({ required: false, enum: ['csv', 'xlsx'], description: 'Export format (csv or xlsx)' })
  @IsOptional()
  @IsString()
  format?: 'csv' | 'xlsx';
}

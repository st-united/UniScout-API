import { IsEnum, IsOptional, IsArray, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { GetUniversityDto } from './get-university.dto';

export enum ExportFormat {
  CSV = 'csv',
  EXCEL = 'excel',
}
export class ExportUniversityDto extends GetUniversityDto {
  @ApiPropertyOptional({
    description: 'List of columns to include in the export',
    type: [String],
    example: 'university,rank,country',
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  columns?: string[];

  @ApiProperty({
    description: 'Export format',
    enum: ExportFormat,
    example: ExportFormat.CSV,
  })
  @IsEnum(ExportFormat)
  format: ExportFormat;
}

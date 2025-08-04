import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsEnum, IsOptional, IsString } from 'class-validator';
import { Job, StatusEnum, UserRole } from '@Constant/enums';

export class ExportUsersDto {
  @ApiPropertyOptional({
    description: 'Fields to include in export',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  fields?: string[];

  @ApiPropertyOptional({
    description: 'Filter by user status',
    enum: StatusEnum,
  })
  @IsOptional()
  @IsEnum(StatusEnum)
  status?: StatusEnum;

  @ApiPropertyOptional({
    description: 'Filter by roles',
    isArray: true,
    enum: UserRole,
  })
  @IsOptional()
  @IsArray()
  @IsEnum(UserRole, { each: true })
  role?: UserRole[];

  @ApiPropertyOptional({
    description: 'Filter by jobs',
    isArray: true,
    enum: Job,
  })
  @IsOptional()
  @IsArray()
  @IsEnum(Job, { each: true })
  job?: Job[];

  @ApiPropertyOptional({
    description: 'Start date for creation filter (YYYY-MM-DD)',
  })
  @IsOptional()
  @IsString()
  createdAtStart?: string;

  @ApiPropertyOptional({
    description: 'End date for creation filter (YYYY-MM-DD)',
  })
  @IsOptional()
  @IsString()
  createdAtEnd?: string;

  @ApiPropertyOptional({
    description: 'Search by name, email, or phone (partial match)',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: 'Export format',
    enum: ['csv', 'xlsx'],
    default: 'csv',
  })
  @IsOptional()
  @IsString()
  format?: 'csv' | 'xlsx';
}

import { IsOptional, IsInt, Min, IsEnum, IsString } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { RequestTypeEnum } from '@Constant/enums';
import { SubmissionStatusEnum } from '../entities';

export class GetContactSubmissionsDto {
  @ApiPropertyOptional({
    description: 'Page number for pagination',
    type: Number,
    default: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Number of items per page for pagination',
    type: Number,
    default: 10,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  pageSize?: number = 10;

  @ApiPropertyOptional({
    description: 'Order of sorting (ASC or DESC)',
    enum: ['ASC', 'DESC'],
    default: 'DESC',
  })
  @IsOptional()
  @IsEnum(['ASC', 'DESC'])
  sortOrder?: 'ASC' | 'DESC' = 'DESC';

  @ApiPropertyOptional({
    description: 'Field to sort by (e.g., submittedAt, requestType, country, status)',
    default: 'submittedAt',
  })
  @IsOptional()
  @IsString()
  sortBy?: string = 'submittedAt';

  @ApiPropertyOptional({
    description: 'Filter by request type',
    enum: RequestTypeEnum,
  })
  @IsOptional()
  @IsEnum(RequestTypeEnum)
  requestType?: RequestTypeEnum;

  @ApiPropertyOptional({
    description: 'Filter by country (exact match)',
  })
  @IsOptional()
  @IsString()
  country?: string;

  @ApiPropertyOptional({
    description: 'Filter by submission status',
    enum: SubmissionStatusEnum,
  })
  @IsOptional()
  @IsEnum(SubmissionStatusEnum)
  status?: SubmissionStatusEnum;

  @ApiPropertyOptional({
    description: 'General search term for university name and abbreviation (partial and similarity match)',
  })
  @IsOptional()
  @IsString()
  search?: string;
}

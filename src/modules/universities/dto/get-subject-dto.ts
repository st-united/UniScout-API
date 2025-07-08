import { IsOptional, IsInt, IsString } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class GetSubjectsDto {
  @ApiPropertyOptional({ description: 'Search term for subject name (partial or full match)' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'ID of the academic field to filter subjects by', type: Number })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  academicFieldId?: number;
}

import { IsOptional, IsInt, IsString, Length, Matches } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class GetSubjectsDto {
  @ApiPropertyOptional({ description: 'Search term for subject name (partial or full match)' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: 'Filter subjects by starting letter (e.g., "A" for all subjects starting with A).',
    type: String,
    maxLength: 1,
    pattern: '^[a-zA-Z]$',
  })
  @IsOptional()
  @IsString()
  @Length(1, 1, { message: 'Starts with filter must be a single character.' })
  @Matches(/^[a-zA-Z]$/, { message: 'Starts with filter must be an alphabet character.' })
  startsWith?: string;

  @ApiPropertyOptional({ description: 'ID of the academic field to filter subjects by', type: Number })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  academicFieldId?: number;
}

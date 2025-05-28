import { IsBoolean, IsOptional, IsString, IsArray, IsInt, IsNotEmpty } from 'class-validator';

// Single restore/undelete
export class RestoreUniversityDto {
  @IsOptional()
  @IsString()
  restore_reason?: string;

  @IsOptional()
  @IsString()
  admin_notes?: string;

  @IsOptional()
  @IsBoolean()
  restore_all_data?: boolean = true; // Restore with all original data
}

// Bulk restore operations
export class BulkRestoreUniversityDto {
  @IsArray()
  @IsInt({ each: true })
  ids: number[];

  @IsOptional()
  @IsString()
  restore_reason?: string;

  @IsOptional()
  @IsString()
  admin_notes?: string;

  @IsOptional()
  @IsBoolean()
  restore_all_data?: boolean = true;
}

// Bulk restore by university names
export class BulkRestoreUniversityByNameDto {
  @IsArray()
  @IsString({ each: true })
  universities: string[];

  @IsOptional()
  @IsString()
  restore_reason?: string;

  @IsOptional()
  @IsString()
  admin_notes?: string;

  @IsOptional()
  @IsBoolean()
  restore_all_data?: boolean = true;
}

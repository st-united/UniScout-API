import { IsBoolean, IsOptional, IsString, IsArray, IsInt, IsNotEmpty } from 'class-validator';

// Single delete
export class DeleteUniversityDto {
  @IsBoolean()
  @IsNotEmpty()
  confirm_deletion: boolean;

  @IsOptional()
  @IsString()
  reason?: string;

  @IsOptional()
  @IsString()
  admin_notes?: string;

  @IsOptional()
  @IsBoolean()
  soft_delete?: boolean = true;
}

// Bulk delete
export class BulkDeleteUniversityDto {
  @IsArray()
  @IsInt({ each: true })
  ids: number[];

  @IsBoolean()
  @IsNotEmpty()
  confirm_deletion: boolean;

  @IsOptional()
  @IsString()
  reason?: string;

  @IsOptional()
  @IsString()
  admin_notes?: string;

  @IsOptional()
  @IsBoolean()
  soft_delete?: boolean = true;
}

// Bulk delete by university names
export class BulkDeleteUniversityByNameDto {
  @IsArray()
  @IsString({ each: true })
  universities: string[];

  @IsBoolean()
  @IsNotEmpty()
  confirm_deletion: boolean;

  @IsOptional()
  @IsString()
  reason?: string;

  @IsOptional()
  @IsString()
  admin_notes?: string;

  @IsOptional()
  @IsBoolean()
  soft_delete?: boolean = true;
}

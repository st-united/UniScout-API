// src/university/dto/chatbot-get-university-dto.ts

import {
  IsOptional,
  IsString,
  IsNumber,
  IsArray,
  IsBoolean,
  IsEnum,
  Min,
  Max,
  ValidateNested,
  ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';

// If you have enums for ExportFormat or SortOrder, define them
export enum ExportFormat {
  PDF = 'pdf',
  EXCEL = 'excel',
}

export enum SortOrder {
  ASC = 'ASC',
  DESC = 'DESC',
}

export class ChatbotGetUniversityDto {
  @IsOptional()
  @IsString()
  search?: string | null;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  type?: string[] | null;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  country?: string[] | null;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  size?: string[] | null;

  @IsOptional()
  @IsNumber()
  @Min(1)
  minRank?: number | null;

  @IsOptional()
  @IsNumber()
  @Max(1000) // Adjust max rank as per your data
  maxRank?: number | null;

  @IsOptional()
  @IsNumber()
  rank?: number | null; // For exact rank queries

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  subjectNames?: string[] | null; // For specific subjects

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  fieldNames?: string[] | null; // For broader academic fields

  @IsOptional()
  @IsString()
  location?: string | null;

  @IsOptional()
  @IsNumber()
  @Min(1)
  limit?: number | null;

  @IsOptional()
  @IsNumber()
  @Min(1)
  page?: number | null;

  @IsOptional()
  @IsEnum(SortOrder) // Use your SortOrder enum if defined
  sortOrder?: SortOrder | null;

  // --- ADD THESE NEW PROPERTIES ---
  @IsOptional()
  @IsEnum(ExportFormat) // Use your ExportFormat enum if defined
  exportFormat?: ExportFormat | null;

  @IsOptional()
  @IsNumber()
  @Min(1)
  exportLimit?: number | null;
  // --- END NEW PROPERTIES ---

  // Add your boolean academic field flags here.
  // Example:
  @IsOptional()
  @IsBoolean()
  agricultural_veterinary_sciences?: boolean | null;

  @IsOptional()
  @IsBoolean()
  arts_design?: boolean | null;

  @IsOptional()
  @IsBoolean()
  business_management_law?: boolean | null; // <--- This one is directly shown in your error

  @IsOptional()
  @IsBoolean()
  education_training?: boolean | null;

  @IsOptional()
  @IsBoolean()
  engineering_technology?: boolean | null;

  @IsOptional()
  @IsBoolean()
  health_medicine?: boolean | null;

  @IsOptional()
  @IsBoolean()
  humanities_languages?: boolean | null;

  @IsOptional()
  @IsBoolean()
  ict?: boolean | null;

  @IsOptional()
  @IsBoolean()
  natural_sciences?: boolean | null;

  @IsOptional()
  @IsBoolean()
  social_behavioral_sciences?: boolean | null;

  @IsOptional()
  @IsBoolean()
  services?: boolean | null;

  @IsOptional()
  @IsBoolean()
  transport_safety_security_military?: boolean | null;
  // --- END ALL ACADEMIC FIELD PROPERTIES ---

  @IsOptional()
  @IsBoolean()
  exchange?: boolean | null;
}

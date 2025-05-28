// src/universities/dto/create-university.dto.ts
import { IsString, IsOptional, IsNumber } from 'class-validator';

export class CreateUniversityDto {
  @IsString() // Keep this one
  name: string;

  // Comment out or remove these for now
  // @IsString()
  // @IsOptional()
  country?: string;

  // @IsNumber()
  // @IsOptional()
  foundedYear?: number;

  // @IsString()
  // @IsOptional()
  website?: string;
}
// src/common/dtos/response.dtos.ts

import { IsArray, IsString, IsOptional, ValidateNested, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * Generic DTO for API responses that return an array of items.
 * @template T The type of the items in the array (e.g., AcademicFieldDto, SubjectDto).
 */
export class ResponseArray<T> {
  @IsArray()
  // @ValidateNested({ each: true }) // Uncomment if you want to validate each item in the array
  // @Type(() => YourItemDto) // Specify the DTO type for array items if you use @ValidateNested
  data: T[]; // The actual array of data

  @IsString()
  message: string; // A descriptive message about the response

  @IsOptional()
  @IsNumber() // Assuming count will be a number
  count?: number; // Total number of items (useful for pagination)

  @IsOptional()
  @IsString() // Assuming status will be a string like "success", "error"
  status?: string;

  /**
   * Constructor for ResponseArray.
   * @param data The array of data to be returned.
   * @param message A message describing the response.
   * @param count The total count of items. Defaults to data.length.
   * @param status The status of the response. Defaults to "success".
   */
  constructor(data: T[], message = 'Success', count?: number, status = 'success') {
    this.data = data;
    this.message = message;
    this.count = count !== undefined ? count : data.length; // Handle explicit 0 count
    this.status = status;
  }
}

/**
 * Generic DTO for API responses that return a single item or no data.
 * @template T The type of the single item (e.g., UserDto, a boolean, null).
 */
export class ResponseItem<T> {
  @IsOptional() // Data might be null for certain responses (e.g., successful delete, no content)
  // If T itself is a DTO, and you want to validate nested properties:
  // @ValidateNested()
  // @Type(() => YourSpecificDtoType) // Replace YourSpecificDtoType with actual DTO like UserDto
  data: T | null; // The single item of data, or null

  @IsString()
  message: string; // A descriptive message about the response

  @IsOptional()
  @IsString()
  status?: string; // e.g., "success", "error"

  /**
   * Constructor for ResponseItem.
   * @param data The single data item or null.
   * @param message A message describing the response.
   * @param status The status of the response. Defaults to "success".
   */
  constructor(data: T | null, message = 'Success', status = 'success') {
    this.data = data;
    this.message = message;
    this.status = status;
  }
}

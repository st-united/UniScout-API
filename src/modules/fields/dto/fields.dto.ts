import { IsNumber, IsString, IsOptional, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class AcademicFieldDto {
  @IsNumber()
  id: number;

  @IsString()
  name: string;
}

export class SubjectDto {
  @IsNumber()
  id: number;

  @IsString()
  name: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => AcademicFieldDto)
  academicField?: AcademicFieldDto;
}

import { IsOptional, IsString, IsEnum, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';

export enum CountryEnum {
  AUSTRALIA = 'Australia',
  INDIA = 'India',
  JAPAN = 'Japan',
  KOREA = 'Korea',
  USA = 'USA',
  VIETNAM = 'Vietnam',
}

export class GetUniversityDto {
  @IsOptional()
  @IsEnum(CountryEnum)
  country?: CountryEnum;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 10;
}

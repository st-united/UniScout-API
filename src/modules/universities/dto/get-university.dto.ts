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
  @IsEnum(CountryEnum, {
    message: `Country must be one of: ${Object.values(CountryEnum).join(', ')}`,
  })
  country?: CountryEnum;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsEnum(['small', 'medium', 'large', 'mega large'])
  size?: 'small' | 'medium' | 'large' | 'mega large';

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

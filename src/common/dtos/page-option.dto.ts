import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

import { Order } from '../constants';

export abstract class PageOptionsDto {
  @IsString()
  search?: string = '';

  @IsEnum(Order)
  @IsOptional()
  order?: Order = Order.DESC;

  orderBy?: string = 'id';

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number = 1;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  take?: number = 10;

  get skip(): number {
    return (this.page - 1) * this.take;
  }
}

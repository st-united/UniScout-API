import { PageOptionsDto } from '@app/common/dtos';
import { IsOptional, IsString, IsEnum } from 'class-validator';
import { StatusEnum } from '@Constant/enums';

export enum UserOrderBy {
  id = 'id',
  name = 'name',
  email = 'email',
  createdAt = 'createdAt',
  updatedAt = 'updatedAt',
}

export class GetUsersDto extends PageOptionsDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsEnum(StatusEnum)
  status?: StatusEnum;

  @IsOptional()
  @IsEnum(UserOrderBy)
  orderBy?: UserOrderBy;
}

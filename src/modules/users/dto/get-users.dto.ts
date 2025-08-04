import { PageOptionsDto } from '@app/common/dtos';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsEnum, IsArray, IsDateString } from 'class-validator';
import { Transform } from 'class-transformer';
import { StatusEnum, UserRole, Job } from '@Constant/enums';

export enum UserOrderBy {
  id = 'id',
  name = 'name',
  email = 'email',
  createdAt = 'createdAt',
  updatedAt = 'updatedAt',
}

export class GetUsersDto extends PageOptionsDto {
  @ApiPropertyOptional({
    description: 'Search keyword for name, email, or phone',
    type: String,
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: 'Filter by user status (e.g., ACTIVE, PENDING)',
    enum: StatusEnum,
  })
  @IsOptional()
  @IsEnum(StatusEnum)
  status?: StatusEnum;

  @ApiPropertyOptional({
    description: 'Filter by one or more user roles (e.g., USER, ADMIN)',
    enum: UserRole,
    isArray: true,
    example: [UserRole.USER],
  })
  @IsOptional()
  @IsArray()
  @IsEnum(UserRole, { each: true })
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return value.split(',');
    }
    return value;
  })
  role?: UserRole[];

  @ApiPropertyOptional({
    description: 'Filter by one or more job types (e.g., MARKETING)',
    enum: Job,
    isArray: true,
    example: [Job.MARKETING],
  })
  @IsOptional()
  @IsArray()
  @IsEnum(Job, { each: true })
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return value.split(',');
    }
    return value;
  })
  job?: Job[];

  @ApiPropertyOptional({
    description: 'Filter by creation date (from, YYYY-MM-DD)',
    type: String,
    format: 'date',
    example: '2024-01-01',
  })
  @IsOptional()
  @IsDateString()
  createdAtStart?: string;

  @ApiPropertyOptional({
    description: 'Filter by creation date (to, YYYY-MM-DD)',
    type: String,
    format: 'date',
    example: '2024-12-31',
  })
  @IsOptional()
  @IsDateString()
  createdAtEnd?: string;

  @ApiPropertyOptional({
    description: 'Field to order by (e.g., id, name, email, createdAt, updatedAt)',
    enum: UserOrderBy,
  })
  @IsOptional()
  @IsEnum(UserOrderBy)
  orderBy?: UserOrderBy;
}

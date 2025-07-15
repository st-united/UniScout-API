import { PartialType } from '@nestjs/mapped-types';
import { Expose } from 'class-transformer';
import {
  IsOptional,
  IsString,
  IsEmail,
  MinLength,
  Matches,
  IsEnum,
  IsDateString,
  IsNumber,
  MaxLength,
} from 'class-validator';
import { StatusEnum } from '@Constant/enums';
import { CreateUserDto } from './create-user.dto';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateUserDto extends PartialType(CreateUserDto) {
  @Expose()
  @IsOptional()
  @IsEmail({}, { message: 'Please provide a valid email address.' })
  email?: string;

  @Expose()
  @IsOptional()
  @IsString()
  phone?: string;

  @Expose()
  @IsOptional()
  @IsString({ message: 'Password must be a string.' })
  @MinLength(8, { message: 'Password must be at least 8 characters long.' })
  @Matches(/^(?=.*[A-Z])(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).*$/, {
    message: 'Password must contain at least one capital letter and one special character.',
  })
  password?: string;

  @Expose()
  @IsOptional()
  @IsString()
  avatar?: string;

  @Expose()
  @IsOptional()
  @IsEnum(StatusEnum, { message: 'Invalid status provided.' })
  status?: StatusEnum;

  @Expose()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ example: 'Software Engineer', description: 'User job title', required: false })
  @IsOptional() // <--- KEEP IsOptional for update DTO if it's a PATCH
  @IsString({ message: 'Nghề nghiệp phải là chuỗi' })
  @MaxLength(100, { message: 'Nghề nghiệp không được vượt quá 100 ký tự' })
  job?: string; // <--- KEEP optional for update DTO

  @Expose()
  @IsOptional()
  @IsDateString()
  dateOfBirth?: string;

  @Expose()
  @IsOptional()
  @IsString()
  address?: string;

  @Expose()
  @IsOptional()
  @IsNumber({}, { message: 'Identity ID must be a number.' })
  identityId?: number;

  @Expose()
  @IsOptional()
  @IsNumber()
  roleId?: number;
}

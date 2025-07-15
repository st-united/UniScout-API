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
  @ApiProperty({ example: 'John Doe', description: 'User name', required: false })
  @IsOptional()
  @IsString({ message: 'Tên phải là chuỗi' })
  @MinLength(3, { message: 'Tên phải có ít nhất 3 ký tự' })
  @MaxLength(50, { message: 'Tên không được vượt quá 50 ký tự' })
  name?: string;

  @ApiProperty({ example: 'test@example.com', description: 'User email', required: false })
  @IsOptional()
  @IsEmail({}, { message: 'Email không hợp lệ' })
  @MinLength(5, { message: 'Email phải có ít nhất 5 ký tự' })
  @MaxLength(255, { message: 'Email không được vượt quá 255 ký tự' })
  email?: string;

  @ApiProperty({ example: 'Software Engineer', description: 'User job title', required: false })
  @IsOptional()
  @IsString({ message: 'Nghề nghiệp phải là chuỗi' })
  @MinLength(3, { message: 'Nghề nghiệp phải có ít nhất 3 ký tự' })
  @MaxLength(100, { message: 'Nghề nghiệp không được vượt quá 100 ký tự' })
  job?: string;

  @ApiProperty({ enum: StatusEnum, example: StatusEnum.ACTIVE, description: 'User status', required: false })
  @IsOptional()
  @IsEnum(StatusEnum, { message: 'Trạng thái không hợp lệ' })
  status?: StatusEnum;
}

import { Expose } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { StatusEnum, UserRole } from '@Constant/enums';

export class UserDto {
  @ApiProperty({ description: 'Unique identifier of the user' })
  @Expose()
  id: number;

  @ApiProperty({ description: 'Email address of the user' })
  @Expose()
  email: string;

  @ApiProperty({ description: 'Phone number of the user', required: false })
  @Expose()
  phone?: string;

  @ApiProperty({ description: 'Job title' })
  @Expose()
  job: string;

  @ApiProperty({ description: "URL to the user's avatar image", required: false })
  @Expose()
  avatar?: string;

  @ApiProperty({ enum: StatusEnum, description: 'Current status of the user account' })
  @Expose()
  status: StatusEnum;

  @ApiProperty({ description: 'Full name of the user' })
  @Expose()
  name: string;

  @ApiProperty({ description: 'Date of birth of the user', type: 'string', format: 'date', required: false })
  @Expose()
  dateOfBirth?: Date;

  @ApiProperty({ description: 'Address of the user', required: false })
  @Expose()
  address?: string;

  @ApiProperty({ description: 'Identity document ID (e.g., CMND/CCCD)', required: false })
  @Expose()
  identityId?: number;

  @ApiProperty({ enum: UserRole, description: 'Role of the user in the system' })
  @Expose()
  role: UserRole;

  @ApiProperty({ description: 'Timestamp when the user account was created' })
  @Expose()
  createdAt: Date;

  @ApiProperty({ description: 'Timestamp when the user account was last updated' })
  @Expose()
  updatedAt: Date;

  @ApiProperty({ description: 'Timestamp when the user account was soft-deleted', required: false })
  @Expose()
  deletedAt?: Date;

  @ApiProperty({ description: 'ID of the user who soft-deleted this account', required: false })
  @Expose()
  deletedBy?: string;
}

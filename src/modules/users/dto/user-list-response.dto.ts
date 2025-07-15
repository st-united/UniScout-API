import { Expose } from 'class-transformer';
import { StatusEnum, UserRole } from '@Constant/enums';
import { ApiProperty } from '@nestjs/swagger';

export class UserListResponseDto {
  @ApiProperty({ description: 'The unique identifier of the user' })
  @Expose()
  id: number;

  @ApiProperty({ description: 'The name of the user' })
  @Expose()
  name: string;

  @ApiProperty({ description: 'The email address of the user' })
  @Expose()
  email: string;

  @ApiProperty({ enum: UserRole, description: 'The role of the user' })
  @Expose()
  role: UserRole;

  @ApiProperty({ enum: StatusEnum, description: 'The status of the user account' })
  @Expose()
  status: StatusEnum;

  @ApiProperty({ description: 'The date and time when the user account was created' })
  @Expose()
  createdAt: Date;
}

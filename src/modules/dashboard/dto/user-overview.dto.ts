// src/modules/dashboard/dto/user-overview.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';

export class UserOverviewDto {
  @ApiProperty({ description: 'Total number of all users in the system.' })
  @Expose()
  totalUsers: number;

  @ApiProperty({ description: 'Number of users with PENDING status.' })
  @Expose()
  pendingUsers: number;

  @ApiProperty({ description: 'Number of users with ACTIVE status.' })
  @Expose()
  activeUsers: number;

  @ApiProperty({ description: 'Number of users with DEACTIVATED status.' })
  @Expose()
  deactivatedUsers: number;

  @ApiProperty({ description: 'Number of users with BLOCKED status.' })
  @Expose()
  blockedUsers: number;
}

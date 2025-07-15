import { IsEnum, IsNotEmpty, IsString, MinLength, MaxLength, ValidateIf } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SubmissionStatusEnum } from '../entities/contact.entity';

export class UpdateContactSubmissionStatusDto {
  @ApiProperty({
    description: 'New status for the contact submission',
    enum: SubmissionStatusEnum,
  })
  @IsEnum(SubmissionStatusEnum, { message: 'Invalid submission status.' })
  @IsNotEmpty({ message: 'Status cannot be empty.' })
  status: SubmissionStatusEnum;

  @ApiPropertyOptional({
    description: 'Reason for rejection (required if status is REJECTED)',
    minLength: 10,
    maxLength: 500,
  })
  @ValidateIf((o) => o.status === SubmissionStatusEnum.REJECTED)
  @IsNotEmpty({ message: 'Rejection reason is required when status is Rejected.' })
  @IsString({ message: 'Rejection reason must be a string.' })
  @MinLength(10, { message: 'Rejection reason must be at least 10 characters long.' })
  @MaxLength(500, { message: 'Rejection reason cannot exceed 500 characters.' })
  rejectionReason?: string;
}

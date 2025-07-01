import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty } from 'class-validator';

export class ConfirmDeleteDto {
  @ApiProperty({
    description: 'Confirm deletion by setting to true',
    example: true,
    type: Boolean,
  })
  @IsBoolean({ message: 'confirm_deletion must be a boolean value' })
  @IsNotEmpty({ message: 'confirm_deletion is required' })
  confirm_deletion: boolean;
}

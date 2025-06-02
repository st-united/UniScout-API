import { ApiProperty } from '@nestjs/swagger';

export class DeleteUniversityResponseDto {
  @ApiProperty({
    example: 'University with ID {id} in {country} has been successfully deleted.',
    description: 'A message confirming successful deletion including the university ID and country code.',
  })
  message: string;

  @ApiProperty({
    example: true,
    description: 'Boolean flag indicating whether the university was deleted successfully.',
  })
  deleted: boolean;
}

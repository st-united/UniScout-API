import {
  IsEmail,
  IsNotEmpty,
  IsString,
  IsEnum,
  IsNumberString,
  IsUrl,
  IsInt,
  Min,
  ValidateIf,
  Validate,
  IsOptional,
  IsArray,
  IsNumber,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { RequestTypeEnum } from '@Constant/enums';
import { UniversityTypeEnum } from '@UniversitiesModule/dto/get-university.dto';
import { IsCountryValidConstraint } from '@UniversitiesModule/validator';

export class CreateContactDto {
  @ApiProperty({
    description: 'Type of request',
    enum: RequestTypeEnum,
    enumName: 'RequestTypeEnum',
  })
  @IsEnum(RequestTypeEnum, { message: 'Invalid request type.' })
  @IsNotEmpty({ message: 'Request type cannot be empty.' })
  requestType: RequestTypeEnum;

  @ApiProperty({ description: 'Name of university' })
  @IsString()
  @IsNotEmpty({ message: 'University Name cannot be empty.' })
  universityName: string;

  @ApiPropertyOptional({ description: 'Name of contact person' })
  @ValidateIf((o) => o.requestType !== RequestTypeEnum.NEW_UNIVERSITY)
  @IsString()
  @IsNotEmpty({ message: 'Representative name cannot be empty for this request type.' })
  representativeName?: string;

  @ApiPropertyOptional({ description: 'Email address of contact person' })
  @ValidateIf((o) => o.requestType !== RequestTypeEnum.NEW_UNIVERSITY)
  @IsEmail({}, { message: 'Please provide a valid email address.' })
  @IsNotEmpty({ message: 'Representative email cannot be empty for this request type.' })
  representativeEmail?: string;

  @ApiPropertyOptional({ description: 'Phone number of contact person' })
  @ValidateIf((o) => o.requestType !== RequestTypeEnum.NEW_UNIVERSITY)
  @IsString()
  @IsNotEmpty({ message: 'Representative phone number cannot be empty for this request type.' })
  @IsNumberString({}, { message: 'Please provide a valid phone number.' })
  representativeNumber?: string;

  @ApiPropertyOptional({ description: 'Message content' })
  @ValidateIf((o) => o.requestType !== RequestTypeEnum.NEW_UNIVERSITY)
  @IsString()
  @IsNotEmpty({ message: 'Message cannot be empty for this request type.' })
  message?: string;

  @ApiPropertyOptional({ description: 'Abbreviation' })
  @ValidateIf((o) => o.requestType === RequestTypeEnum.NEW_UNIVERSITY)
  @IsString()
  abbreviation?: string;

  @ApiPropertyOptional({ description: 'Country' })
  @ValidateIf((o) => o.requestType === RequestTypeEnum.NEW_UNIVERSITY)
  @IsString()
  @IsNotEmpty({ message: 'Country cannot be empty for New University requests.' })
  @Validate(IsCountryValidConstraint, { message: 'Each country must be a valid country from the database.' })
  country?: string;

  @ApiPropertyOptional({ description: 'Location (City/State/Province)' })
  @ValidateIf((o) => o.requestType === RequestTypeEnum.NEW_UNIVERSITY)
  @IsString()
  @IsNotEmpty({ message: 'Location cannot be empty for New University requests.' })
  location?: string;

  @ApiPropertyOptional({
    description: 'University type',
    enum: UniversityTypeEnum,
  })
  @ValidateIf((o) => o.requestType === RequestTypeEnum.NEW_UNIVERSITY)
  @IsEnum(UniversityTypeEnum, { message: 'Invalid university type provided.' })
  @IsNotEmpty({ message: 'University type cannot be empty for New University requests.' })
  type?: string;

  @ApiPropertyOptional({ description: 'University email' })
  @ValidateIf((o) => o.requestType === RequestTypeEnum.NEW_UNIVERSITY)
  @IsString()
  @IsNotEmpty({ message: 'University email cannot be empty for New University requests.' })
  @IsEmail({}, { message: 'Please provide a valid university email address for New University requests.' })
  universityEmail?: string;

  @ApiPropertyOptional({ description: 'University phone number' })
  @ValidateIf((o) => o.requestType === RequestTypeEnum.NEW_UNIVERSITY)
  @IsString()
  @IsNotEmpty({ message: 'University phone number cannot be empty for New University requests.' })
  @IsNumberString({}, { message: 'Please provide a valid university phone number for New University requests.' })
  universityNumber?: string;

  @ApiPropertyOptional({ description: 'Website URL' })
  @ValidateIf((o) => o.requestType === RequestTypeEnum.NEW_UNIVERSITY)
  @IsString()
  @IsNotEmpty({ message: 'Website cannot be empty for New University requests.' })
  @IsUrl({}, { message: 'Please provide a valid website URL for New University requests.' })
  website?: string;

  @ApiPropertyOptional({
    description: 'Number of students',
    type: Number,
  })
  @ValidateIf(
    (o) =>
      o.requestType === RequestTypeEnum.NEW_UNIVERSITY &&
      o.numberOfStudents !== undefined &&
      o.numberOfStudents !== null
  )
  @IsInt({ message: 'Number of students must be an integer.' })
  @Min(0, { message: 'Number of students cannot be negative.' })
  numberOfStudents?: number;

  @ApiPropertyOptional({ description: 'Description' })
  @ValidateIf((o) => o.requestType === RequestTypeEnum.NEW_UNIVERSITY)
  @IsString()
  description?: string;
}

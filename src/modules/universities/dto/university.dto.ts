import { Expose, Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class UniversityDto {
  @Expose() id: number;
  @Expose() university: string;
  @Expose() abbreviation: string;
  @Expose() latitude: number;
  @Expose() longitude: number;
  @Expose() logo?: string;
  @Expose() rank?: number;
  @Expose() type?: string;
  @Expose() country: string;
  @Expose() location?: string;
  @Expose() studentPopulation?: number;
  @Expose()
  get size(): 'small' | 'medium' | 'large' | 'extra large' | null {
    if (this.studentPopulation === undefined || this.studentPopulation === null) {
      return null;
    }
    if (this.studentPopulation < 20000) return 'small';
    if (this.studentPopulation < 40000) return 'medium';
    if (this.studentPopulation < 100000) return 'large';
    return 'extra large';
  }
  @Expose() year?: number;
  @Expose() contact?: string;
  @Expose() email?: string;
  @Expose() website?: string;
  @Expose() strength?: string;
  @Expose() description?: string;
  @Expose() exchange?: boolean;

  @Expose()
  @Transform(({ value }) => {
    return value === null || value === undefined || value === '' ? 'NA' : value;
  })
  academicFieldsCommaSeparated?: string;

  @Expose()
  @Transform(({ value }) => {
    return value === null || value === undefined || value === '' ? 'NA' : value;
  })
  subjectsList?: string;
}

export class UniversityDisplayDto {
  @Expose()
  @ApiProperty()
  id: number;

  @Expose()
  @ApiProperty()
  university: string;

  @Expose()
  @ApiProperty()
  abbreviation: string;

  @Expose()
  @ApiProperty()
  latitude: number;

  @Expose()
  @ApiProperty()
  longitude: number;

  @Expose()
  @ApiProperty({ required: false })
  logo?: string;

  @Expose()
  @ApiProperty({ required: false })
  rank?: number;

  @Expose()
  @ApiProperty({ required: false })
  type?: string;

  @Expose()
  @ApiProperty()
  country: string;

  @Expose()
  @ApiProperty({ required: false })
  location?: string;

  @Expose()
  @ApiProperty({ required: false })
  studentPopulation?: number;

  @Expose()
  @ApiProperty({ enum: ['small', 'medium', 'large', 'extra large'], required: false })
  size: 'small' | 'medium' | 'large' | 'extra large' | null;

  @Expose()
  @ApiProperty({ required: false })
  year?: number;

  @Expose()
  @ApiProperty({ required: false })
  contact?: string;

  @Expose()
  @ApiProperty({ required: false })
  email?: string;

  @Expose()
  @ApiProperty({ required: false })
  website?: string;

  @Expose()
  @ApiProperty({ required: false })
  strength?: string;

  @Expose()
  @ApiProperty({ required: false })
  description?: string;

  @Expose()
  @ApiProperty({ required: false, description: 'Indicates if exchange is available (Yes/No/-)' })
  @Transform(({ value }) => {
    if (value === true) {
      return 'Yes';
    } else if (value === false) {
      return 'No';
    } else {
      return '-';
    }
  })
  exchange?: string;

  @Expose()
  @ApiProperty({ required: false })
  academicFieldsCommaSeparated?: string;

  @Expose()
  @ApiProperty({ required: false })
  subjectsList?: string;
}

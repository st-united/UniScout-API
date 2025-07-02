import { Expose, Transform } from 'class-transformer';

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

export interface UniversityDisplayDto {
  id: number;
  university: string;
  abbreviation: string;
  latitude: number;
  longitude: number;
  logo?: string;
  rank?: number;
  type?: string;
  country: string;
  location?: string;
  studentPopulation?: number;
  size: 'small' | 'medium' | 'large' | 'extra large' | null;
  year?: number;
  contact?: string;
  email?: string;
  website?: string;
  strength?: string;
  description?: string;
  exchange?: string;
  academicFieldsCommaSeparated?: string;
  subjectsList?: string;
  [key: string]: any;
}

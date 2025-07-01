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
  get size(): 'small' | 'medium' | 'large' | 'extra large' {
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

  @Expose({ name: 'academic_fields' })
  @Transform(({ obj }) => {
    if (Array.isArray(obj.academicFields)) {
      return (
        obj.academicFields
          .map((field: any) => field.name)
          ?.filter(Boolean)
          .join(', ') || 'NA'
      );
    }
    return 'NA';
  })
  academicFields?: string;
}

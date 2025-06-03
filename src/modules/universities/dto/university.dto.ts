import { Expose } from 'class-transformer';

export class UniversityDto {
  @Expose() id: number;
  @Expose() university: string;
  @Expose() latitude: number;
  @Expose() longitude: number;
  @Expose() logo?: string;
  @Expose() rank?: number;
  @Expose() type?: string;
  @Expose() country: string;
  @Expose() location?: string;
  @Expose() student?: number;
  @Expose()
  get size(): 'small' | 'medium' | 'large' | 'mega large' | 'unknown' {
    if (this.student == null) return 'unknown';
    if (this.student < 20000) return 'small';
    if (this.student < 40000) return 'medium';
    if (this.student < 100000) return 'large';
    return 'mega large';
  }
  @Expose() year?: number;
  @Expose() contact?: string;
  @Expose() email?: string;
  @Expose() website?: string;
  @Expose() strength?: string;
  @Expose() description?: string;
  @Expose() exchange?: boolean;
  @Expose() agricultural_food_science?: boolean;
  @Expose() arts_design?: boolean;
  @Expose() economics_business_management?: boolean;
  @Expose() engineering?: boolean;
  @Expose() law_political_science?: boolean;
  @Expose() medicine_pharmacy_health_sciences?: boolean;
  @Expose() physical_science?: boolean;
  @Expose() social_sciences_humanities?: boolean;
  @Expose() sports_physical_education?: boolean;
  @Expose() technology?: boolean;
  @Expose() theology?: boolean;
}

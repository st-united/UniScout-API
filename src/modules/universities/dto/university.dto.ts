// base university DTO with common fields
import { Expose } from 'class-transformer';

export class UniversityDto {
  @Expose() id: number;
  @Expose() university: string;
  @Expose() logo?: string;
  @Expose() rank?: number;
  @Expose() type?: string;
  @Expose() country: string;
  @Expose() location?: string;
  @Expose() student?: number;
  @Expose() year?: number;
  @Expose() contact?: string;
  @Expose() email?: string;
  @Expose() website?: string;
  @Expose() strength?: string;
  @Expose() description?: string;

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
}

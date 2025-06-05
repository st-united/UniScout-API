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
  @Expose() studentPopulation?: number;
  @Expose()
  get size(): 'small' | 'medium' | 'large' | 'mega large' | 'unknown' {
    if (this.studentPopulation == null) return 'unknown';
    if (this.studentPopulation < 20000) return 'small';
    if (this.studentPopulation < 40000) return 'medium';
    if (this.studentPopulation < 100000) return 'large';
    return 'mega large';
  }
  @Expose() year?: number;
  @Expose() contact?: string;
  @Expose() email?: string;
  @Expose() website?: string;
  @Expose() strength?: string;
  @Expose() description?: string;
  @Expose() exchange?: boolean;
  @Expose() agriculturalFoodScience?: boolean;
  @Expose() artsDesign?: boolean;
  @Expose() economicsBusinessManagement?: boolean;
  @Expose() engineering?: boolean;
  @Expose() lawPoliticalScience?: boolean;
  @Expose() medicinePharmacyHealthSciences?: boolean;
  @Expose() physicalScience?: boolean;
  @Expose() socialSciencesHumanities?: boolean;
  @Expose() sportsPhysicalEducation?: boolean;
  @Expose() technology?: boolean;
  @Expose() theology?: boolean;
}

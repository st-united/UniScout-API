// src/modules/universities/dto/chatbot-get-university.dto.ts

import { UniversityTypeEnum, UniversitySizeEnum, SortOrderEnum } from './get-university.dto';

export class ChatbotGetUniversityDto {
  search?: string;
  type?: UniversityTypeEnum[];
  country?: string[];
  location?: string;
  size?: UniversitySizeEnum[]; // Assuming this can be an array now
  minRank?: number;
  maxRank?: number;
  rank?: number;
  limit?: number;
  page?: number; // Include page for consistency with GetUniversityDto
  sortOrder?: SortOrderEnum;

  // These are the specific fields for chatbot subject/field search
  subjectNames?: string[];
  fieldNames?: string[]; // Corrected to string[]

  // Include the boolean flags for academic fields here, as UniversityService might use them directly
  agricultural_veterinary_sciences?: boolean;
  arts_design?: boolean;
  business_management_law?: boolean;
  education_training?: boolean;
  engineering_technology?: boolean;
  health_medicine?: boolean;
  humanities_languages?: boolean;
  ict?: boolean;
  natural_sciences?: boolean;
  social_behavioral_sciences?: boolean;
  services?: boolean;
  transport_safety_security_military?: boolean;
  exchange?: boolean; // If 'exchange' is a filterable boolean property
}

import { UniversityTypeEnum, UniversitySizeEnum, SortOrderEnum } from '@UniversitiesModule/dto/get-university.dto';

export interface ChatMessage {
  role: 'user' | 'assistant';
  parts: { text: string }[];
}

export interface UniversityQuery {
  search?: string;
  country?: string[];
  type?: UniversityTypeEnum[];
  minRank?: number;
  maxRank?: number;
  rank?: number;
  location?: string;
  size?: UniversitySizeEnum[];
  limit?: number;
  exportFormat?: 'excel' | 'pdf';
  exportLimit?: number;
  sortOrder?: SortOrderEnum;

  subjectNames?: string[];
  fieldNames?: string[];

  fields?: Record<string, boolean>;

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
  exchange?: boolean;
}

export interface ChatResponseData {
  response: string;
  timestamp: string;
  suggestedQuestions?: string[];
}

export interface ChatResponseDataWithFile extends ChatResponseData {
  fileData?: {
    type: 'excel' | 'pdf';
    base64: string;
    filename: string;
  };
}

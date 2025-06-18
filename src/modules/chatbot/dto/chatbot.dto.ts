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
  fields?: Record<string, boolean>;
  academicFields?: string[];
  limit?: number;
  exportFormat?: 'excel' | 'pdf';
  exportLimit?: number;
  sortOrder?: SortOrderEnum;
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

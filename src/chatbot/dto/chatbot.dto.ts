export interface ChatMessage {
  role: 'user' | 'model';
  parts: { text: string }[];
}

export interface UniversityQuery {
  search?: string;
  country?: string[];
  type?: string;
  minRank?: number;
  maxRank?: number;
  rank?: number;
  location?: string;
  size?: 'small' | 'medium' | 'large' | 'mega_large';
  fields?: Record<string, boolean>;
  page?: number;
  limit?: number;
  exportFormat?: 'pdf' | 'excel';
}

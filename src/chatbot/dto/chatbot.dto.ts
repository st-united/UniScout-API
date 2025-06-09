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
  exportLimit?: number;
}

export interface ChatResponseDataWithFile {
  response: string; // The conversational text response
  timestamp: string;
  suggestedQuestions?: string[]; // Optional, for initial greetings or follow-up questions
  fileData?: {
    // This optional field will contain file details if an export is triggered
    type: 'excel' | 'pdf'; // The type of file (e.g., 'excel')
    base64: string; // The base64 encoded content of the file
    filename: string; // The suggested filename for download
  };
}

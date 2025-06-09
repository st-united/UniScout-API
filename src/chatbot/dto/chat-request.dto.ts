import { IsString, IsNotEmpty, IsArray, ValidateNested, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

export class MessagePartDto {
  @IsString()
  @IsNotEmpty()
  text: string;
}

export class ChatMessageDto {
  @IsString()
  @IsNotEmpty()
  role: 'user' | 'model';

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MessagePartDto)
  parts: MessagePartDto[];
}

export class ChatRequestDto {
  @IsString()
  //@IsNotEmpty() testing for initial message in API
  message: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ChatMessageDto)
  conversationHistory?: ChatMessageDto[];
}

export interface ChatResponseData {
  response: string;
  timestamp: string;
  suggestedQuestions?: string[];
  file?: {
    buffer: Buffer; // The actual file content as a Buffer
    mimetype: string; // e.g., 'application/pdf', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    filename: string; // e.g., 'universities.pdf', 'universities.xlsx'
  };
}

export interface ChatResponseDto {
  success: boolean;
  message: string;
  data?: ChatResponseData;
  error?: string;
}

//stop

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
    buffer: Buffer;
    mimetype: string;
    filename: string;
  };
}

export interface ChatResponseDto {
  success: boolean;
  message: string;
  data?: ChatResponseData;
  error?: string;
}

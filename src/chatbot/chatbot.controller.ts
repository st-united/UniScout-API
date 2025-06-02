import { Controller, Post, Body, HttpCode, HttpStatus, Logger } from '@nestjs/common';
import { ChatbotService } from './chatbot.service';

// DTO for incoming chat messages
class ChatMessageDto {
  message: string;
  sessionId?: string; // Optional: for continuing a conversation
}

@Controller('chatbot') // Your base API path will be /api/chatbot
export class ChatbotController {
  private readonly logger = new Logger(ChatbotController.name);

  constructor(private readonly chatbotService: ChatbotService) {}

  @Post('message')
  @HttpCode(HttpStatus.OK)
  // You can add your JwtAccessTokenGuard and RolesGuard here if you want to protect this endpoint
  // @UseGuards(JwtAccessTokenGuard)
  // @Roles(UserRole.USER, UserRole.ADMIN)
  async handleMessage(@Body() chatMessageDto: ChatMessageDto): Promise<{ response: string; sessionId: string }> {
    const { message, sessionId } = chatMessageDto;
    this.logger.log(`Received message: "${message}" for session: ${sessionId || 'new'}`);

    // Generate a new session ID if one isn't provided (for new chats)
    const currentSessionId = sessionId || `chat-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const aiResponse = await this.chatbotService.sendChatMessage(currentSessionId, message);

    return { response: aiResponse, sessionId: currentSessionId };
  }
}

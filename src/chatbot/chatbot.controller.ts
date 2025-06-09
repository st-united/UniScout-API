import { Controller, Post, Body, ValidationPipe, UsePipes } from '@nestjs/common';
import { ChatbotService } from './chatbot.service';
import { ChatRequestDto, ChatResponseData, ChatResponseDto } from './dto/chat-request.dto';

@Controller('chatbot')
export class ChatbotController {
  constructor(private readonly _chatbotService: ChatbotService) {}

  @Post()
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async chat(@Body() chatRequest: ChatRequestDto): Promise<ChatResponseDto> {
    try {
      const response: ChatResponseData = await this._chatbotService.chat(
        chatRequest.message,
        chatRequest.conversationHistory || []
      );

      return {
        success: true,
        message: 'Chat response generated successfully',
        data: response,
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to generate chat response',
        error: error.message,
      };
    }
  }

  @Post('countries')
  async getValidCountries() {
    try {
      const countries = await this._chatbotService.getValidCountries();
      return {
        success: true,
        message: 'Valid countries retrieved successfully',
        data: countries,
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to retrieve valid countries',
        error: error.message,
      };
    }
  }
}
//stop

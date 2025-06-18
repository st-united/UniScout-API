import { Body, Controller, Post, Res, BadRequestException, ValidationPipe, UsePipes } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ChatbotService } from './chatbot.service';
import { ChatRequestDto, ChatResponseData, ChatResponseDto, ChatMessageDto } from './dto/chat-request.dto';
import { ChatMessage } from './dto/chatbot.dto';

@ApiTags('chatbot')
@Controller('chatbot')
export class ChatbotController {
  constructor(private readonly _chatbotService: ChatbotService) {}

  @Post()
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async chat(@Body() chatRequest: ChatRequestDto): Promise<ChatResponseDto> {
    try {
      const mappedConversationHistory: ChatMessage[] =
        chatRequest.conversationHistory?.map((msg: ChatMessageDto) => ({
          role: msg.role === 'model' ? 'assistant' : 'user',
          parts: msg.parts,
        })) || [];

      const response: ChatResponseData = await this._chatbotService.chat(
        chatRequest.message,
        mappedConversationHistory
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

  @Post('export-universities')
  async exportUniversities(@Body() body: { universities: number[]; type: string }, @Res() res) {
    if (!body.universities || body.universities.length === 0) {
      throw new BadRequestException('At least one university ID is required for export.');
    }
    if (!body.type || (body.type !== 'excel' && body.type !== 'pdf')) {
      throw new BadRequestException('Invalid export type. Must be "excel" or "pdf".');
    }

    if (body.type === 'excel') {
      const fileBuffer = await this._chatbotService.exportUniversitiesAsExcel(body.universities);
      res.set({
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="universities.xlsx"`,
      });
      res.send(Buffer.from(fileBuffer, 'base64'));
    } else if (body.type === 'pdf') {
      const fileBuffer = await this._chatbotService.exportUniversitiesAsPdf(body.universities);
      res.set({
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="universities.pdf"`,
      });
      res.send(Buffer.from(fileBuffer, 'base64'));
    } else {
      throw new BadRequestException('Invalid export type. Must be "excel" or "pdf".');
    }
  }
}

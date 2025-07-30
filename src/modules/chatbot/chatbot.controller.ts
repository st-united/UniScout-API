// src/chatbot/chatbot.controller.ts
import { Body, Controller, Post, Res, HttpStatus } from '@nestjs/common';
import { ChatbotService } from './chatbot.service';
import { Response } from 'express'; // Import Response from express

@Controller('chatbot') // The controller path will be /api/chatbot due to global prefix
export class ChatbotController {
  constructor(private readonly chatbotService: ChatbotService) {}

  @Post('message') // This will be accessible at /api/chatbot/message
  async handleChatMessage(
    @Body('message') message: string,
    @Body('sessionId') sessionId: string,
    @Res() res: Response // Use @Res() to manually control the response
  ) {
    try {
      // The service returns a plain object: { reply: string, sessionId: string }
      const chatResponse = await this.chatbotService.sendMessage(message, sessionId);

      // Explicitly send a plain JSON response to avoid class-transformer issues
      res.status(HttpStatus.OK).json({
        reply: chatResponse.reply,
        timestamp: new Date().toISOString(), // Include a timestamp
        sessionId: chatResponse.sessionId, // Send back the session ID
      });
    } catch (error) {
      console.error('Error in handleChatMessage:', error);
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        error: 'An internal server error occurred.',
        // details: error.message, // Consider removing `details` in production for security
      });
    }
  }

  @Post('reset') // This will be accessible at /api/chatbot/reset
  async handleResetChat(
    @Body('sessionId') sessionId: string,
    @Res() res: Response // Use @Res() to manually control the response
  ) {
    try {
      this.chatbotService.resetChatSession(sessionId);
      res.status(HttpStatus.OK).json({ message: 'Chat session reset successfully.' });
    } catch (error) {
      console.error('Error in handleResetChat:', error);
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        error: 'Failed to reset chat session.',
        // details: error.message, // Consider removing `details` in production
      });
    }
  }
}

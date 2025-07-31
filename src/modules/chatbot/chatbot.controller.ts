// src/modules/chatbot/chatbot.controller.ts
import { Controller, Post, Body, Get, Param, Res, HttpStatus, Logger } from '@nestjs/common';
import { ChatbotService, ChatbotReply } from './chatbot.service'; // Import ChatbotReply
import { Response } from 'express'; // Import Response from express
import * as path from 'path';
import * as fs from 'fs'; // Import Node.js File System for file existence checks and streaming
import { join } from 'path';

@Controller('chatbot')
export class ChatbotController {
  private readonly logger = new Logger(ChatbotController.name);

  constructor(private readonly chatbotService: ChatbotService) {}

  @Post('message')
  // Adjusted: Takes message and userId directly from the body
  async sendMessage(@Body('message') message: string, @Body('userId') userId: string): Promise<ChatbotReply> {
    return this.chatbotService.sendMessage(message, userId);
  }

  // New endpoint to serve the PDF files
  @Get('download-pdf/:filename')
  async downloadPdf(@Param('filename') filename: string, @Res() res: Response) {
    // Define the directory where PDFs are saved (MUST match ChatbotService)
    const tempPdfDir = path.join(process.cwd(), 'temp_pdfs');
    const filePath = path.join(tempPdfDir, filename);

    this.logger.log(`Attempting to serve file: ${filePath}`);

    // Check if the file exists
    if (fs.existsSync(filePath)) {
      // Set headers for file download
      res.setHeader('Content-Type', 'application/pdf');
      // 'Content-Disposition: attachment' prompts the browser to download the file
      // 'filename=' specifies the name of the downloaded file
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

      // Stream the file to the client
      const fileStream = fs.createReadStream(filePath);
      fileStream.pipe(res);

      fileStream.on('error', (err) => {
        this.logger.error(`Error streaming file ${filename}: ${err.message}`);
        res.status(HttpStatus.INTERNAL_SERVER_ERROR).send('Error downloading file.');
      });

      fileStream.on('end', () => {
        this.logger.log(`Successfully streamed file: ${filename}`);
        // Optionally, delete the file after successful download if it's truly temporary
        // fs.unlink(filePath, (unlinkErr) => {
        //   if (unlinkErr) this.logger.error(`Error deleting temporary file ${filename}: ${unlinkErr.message}`);
        //   else this.logger.log(`Deleted temporary file: ${filename}`);
        // });
      });
    } else {
      // If file not found, send 404
      this.logger.warn(`File not found: ${filePath}`);
      res.status(HttpStatus.NOT_FOUND).send('File not found.');
    }
  }
  @Get('download-excel/:filename')
  async downloadExcel(@Param('filename') filename: string, @Res() res: Response) {
    const filePath = join(process.cwd(), 'temp_excels', filename);
    // Check if file exists to prevent serving non-existent files
    if (fs.existsSync(filePath)) {
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
      return res.sendFile(filePath);
    } else {
      res.status(404).send('File not found.');
    }
  }

  @Post('reset')
  async resetChat(@Body('userId') userId: string) {
    this.chatbotService.resetChatSession(userId);
    return { message: 'Chat session reset successfully.' };
  }
}

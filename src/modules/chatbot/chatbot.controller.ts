import { Controller, Post, Body, Get, Param, Res, HttpStatus, Logger } from '@nestjs/common';
import { ChatbotService, ChatbotReply } from './chatbot.service';
import { Response } from 'express';
import * as path from 'path';
import * as fs from 'fs';
import { join } from 'path';

@Controller('chatbot')
export class ChatbotController {
  private readonly logger = new Logger(ChatbotController.name);

  constructor(private readonly chatbotService: ChatbotService) {}

  @Post('message')
  async sendMessage(@Body('message') message: string, @Body('userId') userId: string): Promise<ChatbotReply> {
    return this.chatbotService.sendMessage(message, userId);
  }

  @Get('download-pdf/:filename')
  async downloadPdf(@Param('filename') filename: string, @Res() res: Response) {
    const filePath = path.join(process.cwd(), 'downloads', filename);
    this.logger.log(`Attempting to download PDF: ${filePath}`);

    if (fs.existsSync(filePath)) {
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      fs.createReadStream(filePath).pipe(res);
    } else {
      this.logger.warn(`PDF file not found: ${filePath}`);
      res.status(HttpStatus.NOT_FOUND).send('File not found.');
    }
  }

  @Get('download-excel/:filename')
  async downloadExcel(@Param('filename') filename: string, @Res() res: Response) {
    const tempExcelDir = join(process.cwd(), 'temp_exports');
    const filePath = join(tempExcelDir, filename);

    if (fs.existsSync(filePath)) {
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      const fileStream = fs.createReadStream(filePath);
      fileStream.pipe(res);

      fileStream.on('error', (err) => {
        this.logger.error(`Error streaming Excel file ${filename}: ${err.message}`);
        res.status(HttpStatus.INTERNAL_SERVER_ERROR).send('Error downloading file.');
      });

      fileStream.on('end', () => {
        this.logger.log(`Successfully streamed Excel file: ${filename}`);
      });
    } else {
      this.logger.warn(`Excel file not found at: ${filePath}`);
      res.status(HttpStatus.NOT_FOUND).send('File not found.');
    }
  }

  @Get('download-csv/:filename')
  async downloadCsv(@Param('filename') filename: string, @Res() res: Response) {
    const tempCsvDir = join(process.cwd(), 'temp_exports');
    const filePath = join(tempCsvDir, filename);

    this.logger.log(`Attempting to serve CSV file from: ${filePath}`);

    if (fs.existsSync(filePath)) {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      const fileStream = fs.createReadStream(filePath);
      fileStream.pipe(res);

      fileStream.on('error', (err) => {
        this.logger.error(`Error streaming CSV file ${filename}: ${err.message}`);
        res.status(HttpStatus.INTERNAL_SERVER_ERROR).send('Error downloading file.');
      });

      fileStream.on('end', () => {
        this.logger.log(`Successfully streamed CSV file: ${filename}`);
      });
    } else {
      this.logger.warn(`CSV file not found at: ${filePath}`);
      res.status(HttpStatus.NOT_FOUND).send('File not found.');
    }
  }

  @Post('reset')
  async resetChat(@Body('userId') userId: string) {
    this.chatbotService.resetChatSession(userId);
    return { message: 'Chat session reset successfully.' };
  }
}

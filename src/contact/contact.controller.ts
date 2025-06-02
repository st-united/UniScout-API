import { Body, Controller, Post, Res, HttpStatus } from '@nestjs/common';
import { ContactService } from './contact.service';
import { CreateContactDto } from './dto/create-contact.dto';
import { response, Response } from 'express';

@Controller('api/contact')
export class ContactController {
  constructor(private readonly contactService: ContactService) {}

  @Post()
  async submitContactForm(@Body() createContactDto: CreateContactDto) {
    try {
      const result = await this.contactService.handleSubmitContactForm(createContactDto);
      return result;
    } catch (error) {
      return response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Failed to send contact message.',
        error: error.message || 'Internal Server Error',
      });
    }
  }
}

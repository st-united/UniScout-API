import { Body, Controller, Post, Res, HttpStatus } from '@nestjs/common';
import { ContactService } from './contact.service';
import { CreateContactDto } from './dto/create-contact.dto';
import { Response } from 'express'; 

@Controller('api/contact') 
export class ContactController {
  constructor(private readonly contactService: ContactService) {}

  @Post()
  async submitContactForm(@Body() createContactDto: CreateContactDto, @Res() res: Response) {
    try {
      const result = await this.contactService.handleSubmitContactForm(createContactDto);
      return res.status(HttpStatus.OK).json(result);
    } catch (error) {
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Failed to send contact message.',
        error: error.message || 'Internal Server Error',
      });
    }
  }
}
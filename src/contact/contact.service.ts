import { Injectable, Logger } from '@nestjs/common';
import { CreateContactDto } from './dto/create-contact.dto';
import { ConfigService } from '@nestjs/config'; 

import * as nodemailer from 'nodemailer';

@Injectable()
export class ContactService {
  private readonly logger = new Logger(ContactService.name);
  private transporter;

  constructor(private readonly configService: ConfigService) {

    this.transporter = nodemailer.createTransport({
      host: this.configService.get<string>('EMAIL_HOST'),
      port: this.configService.get<number>('EMAIL_PORT'),
      secure: this.configService.get<boolean>('EMAIL_SECURE'), 
      auth: {
        user: this.configService.get<string>('EMAIL_USER'),
        pass: this.configService.get<string>('EMAIL_PASS'),
      },
    });
  }

  async handleSubmitContactForm(createContactDto: CreateContactDto) {
    this.logger.log(`Received contact form submission from: ${createContactDto.email}`);

    try {

      const mailOptions = {
        from: `"${createContactDto.name}" <${createContactDto.email}>`, 
        to: this.configService.get<string>('CONTACT_FORM_RECEIVER_EMAIL'), 
        subject: createContactDto.subject || `New Contact Form Submission from UniScout`,
        html: `
          <h3>Contact Details:</h3>
          <p><strong>Name:</strong> ${createContactDto.name}</p>
          <p><strong>Email:</strong> ${createContactDto.email}</p>
          <p><strong>Subject:</strong> ${createContactDto.subject || 'N/A'}</p>
          <h3>Message:</h3>
          <p>${createContactDto.message}</p>
        `,

        text: `Name: ${createContactDto.name}\nEmail: ${createContactDto.email}\nSubject: ${createContactDto.subject || 'N/A'}\nMessage: ${createContactDto.message}`,
      };

      await this.transporter.sendMail(mailOptions);
      this.logger.log(`Contact form email sent successfully from ${createContactDto.email}.`);
      return { message: 'Contact form submitted successfully!' };

    } catch (error) {
      this.logger.error(`Failed to send contact form email from ${createContactDto.email}:`, error.stack);
      throw new Error('Failed to submit contact form. Please try again later.'); 
    }
  }
}
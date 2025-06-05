import { Injectable, Logger } from '@nestjs/common';
import { CreateContactDto } from './dto/create-contact.dto';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import * as fs from 'fs';
import * as path from 'path';

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
      tls: {
        rejectUnauthorized: false,
      },
    });
  }

  async handleSubmitContactForm(
    createContactDto: CreateContactDto,
    attachmentPaths: string[] = []
  ): Promise<{ message: string }> {
    const senderEmail = createContactDto.email;
    this.logger.log(`Received contact form submission from: ${senderEmail}`);

    try {
      const { name, country, message, universityName, phoneNumber, requestType } = createContactDto;

      const attachments = attachmentPaths.map((filePath) => ({
        filename: path.basename(filePath),
        path: filePath,
      }));

      const mailOptions = {
        from: `"${name}" <${senderEmail}>`,
        to: this.configService.get<string>('CONTACT_FORM_RECEIVER_EMAIL'),
        subject: `UNISCOUT`,
        html: `
          <h3>Contact Details:</h3>
          <p><strong>Name:</strong> ${name}</p>
          <p><strong>Email:</strong> ${senderEmail}</p>
          <p><strong>Phone Number:</strong> ${phoneNumber || 'N/A'}</p>
          <p><strong>University Name:</strong> ${universityName || 'N/A'}</p>
          <p><strong>Request Type:</strong> ${requestType}</p>
          <p><strong>Country:</strong> ${country || 'N/A'}</p>
          <h3>Message:</h3>
          <p>${message}</p>
        `,
        text: `Name: ${name}\nEmail: ${senderEmail}\nPhone Number: ${phoneNumber || 'N/A'}\nUniversity Name: ${
          universityName || 'N/A'
        }\nRequest Type: ${requestType}\nCountry: ${country || 'N/A'}\nMessage: ${message}`,
        attachments: attachments,
      };

      await this.transporter.sendMail(mailOptions);
      this.logger.log(`Contact form email sent successfully from ${senderEmail}.`);
      return { message: 'Contact form submitted successfully!' };
    } catch (error) {
      this.logger.error(`Failed to send contact form email from ${senderEmail || 'unknown'}:`, error.stack);
      throw new Error('Failed to submit contact form. Please try again later.');
    } finally {
      attachmentPaths.forEach((filePath) => {
        fs.unlink(filePath, (err) => {
          if (err) this.logger.error(`Failed to delete temporary attachment file: ${filePath}, Error: ${err.message}`);
          else this.logger.log(`Successfully deleted temporary attachment file: ${filePath}`);
        });
      });
    }
  }
}

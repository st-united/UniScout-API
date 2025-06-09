import { Injectable, Logger } from '@nestjs/common';
import { CreateContactDto } from './dto/create-contact.dto';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import * as fs from 'fs';
import * as path from 'path';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ContactSubmissionEntity } from './entities';

@Injectable()
export class ContactService {
  private readonly _logger = new Logger(ContactService.name);
  private _transporter;

  constructor(
    private readonly _configService: ConfigService,
    @InjectRepository(ContactSubmissionEntity)
    private readonly _contactSubmissionRepo: Repository<ContactSubmissionEntity>
  ) {
    this._transporter = nodemailer.createTransport({
      host: this._configService.get<string>('EMAIL_HOST'),
      port: this._configService.get<number>('EMAIL_PORT'),
      secure: this._configService.get<boolean>('EMAIL_SECURE'),
      auth: {
        user: this._configService.get<string>('EMAIL_USER'),
        pass: this._configService.get<string>('EMAIL_PASS'),
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
    this._logger.log(`Received contact form submission from: ${senderEmail}`);

    try {
      const { name, country, message, universityName, phoneNumber, requestType } = createContactDto;

      const attachments = attachmentPaths.map((filePath) => ({
        filename: path.basename(filePath),
        path: filePath,
      }));

      const mailOptions = {
        from: `"${name}" <${senderEmail}>`,
        to: this._configService.get<string>('CONTACT_FORM_RECEIVER_EMAIL'),
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

      await this._transporter.sendMail(mailOptions);
      this._logger.log(`Contact form email sent successfully from ${senderEmail}.`);

      const newSubmission = this._contactSubmissionRepo.create({
        email: senderEmail,
        name: name,
      });
      await this._contactSubmissionRepo.save(newSubmission);

      return { message: 'Contact form submitted successfully!' };
    } catch (error) {
      this._logger.error(`Failed to send contact form email from ${senderEmail || 'unknown'}:`, error.stack);
      throw new Error('Failed to submit contact form. Please try again later.');
    } finally {
      attachmentPaths.forEach((filePath) => {
        fs.unlink(filePath, (err) => {
          if (err) this._logger.error(`Failed to delete temporary attachment file: ${filePath}, Error: ${err.message}`);
          else this._logger.log(`Successfully deleted temporary attachment file: ${filePath}`);
        });
      });
    }
  }
}

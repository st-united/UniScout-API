import { Injectable, Logger } from '@nestjs/common';
import { CreateContactDto } from './dto/create-contact.dto';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import * as fs from 'fs';
import * as path from 'path';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ContactSubmissionEntity } from './entities';
import { RequestTypeEnum } from '@Constant/enums';

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
      const {
        name,
        email,
        message,
        universityName,
        phoneNumber,
        requestType,
        // All other fields, will be conditionally rendered
        country,
        location,
        type,
        universityEmail,
        website,
        broadFieldOfStudy,
        specificFieldOfStudy,
        rank,
        numberOfStudents,
      } = createContactDto;

      const attachments = attachmentPaths.map((filePath) => ({
        filename: path.basename(filePath),
        path: filePath,
      }));

      // --- Prepare HTML and Text Content Conditionally ---
      let universityDetailsHtml = '';
      let universityDetailsText = '';

      if (requestType === RequestTypeEnum.NEW_UNIVERSITY) {
        universityDetailsHtml = `
          <h3>University Details (New University):</h3>
          <p><strong>University Name:</strong> ${universityName}</p>
          <p><strong>Country:</strong> ${country}</p>
          <p><strong>Location:</strong> ${location}</p>
          <p><strong>Type:</strong> ${type}</p>
          <p><strong>University Email:</strong> ${universityEmail}</p>
          <p><strong>Website:</strong> <a href="${website}">${website}</a></p>
          <p><strong>Broad Field of Study:</strong> ${broadFieldOfStudy}</p>
          <p><strong>Specific Field of Study:</strong> ${specificFieldOfStudy}</p>
          ${typeof rank === 'number' ? `<p><strong>Rank:</strong> ${rank}</p>` : ''}
          ${
            typeof numberOfStudents === 'number'
              ? `<p><strong>Number of Students:</strong> ${numberOfStudents}</p>`
              : ''
          }
        `;
        universityDetailsText = `
          University Details (New University):
          University Name: ${universityName}
          Country: ${country}
          Location: ${location}
          Type: ${type}
          University Email: ${universityEmail}
          Website: ${website}
          Broad Field of Study: ${broadFieldOfStudy}
          Specific Field of Study: ${specificFieldOfStudy}
          ${typeof rank === 'number' ? `Rank: ${rank}\n` : ''}
          ${typeof numberOfStudents === 'number' ? `Number of Students: ${numberOfStudents}\n` : ''}
        `;
      } else if (requestType === RequestTypeEnum.UPDATE_INFORMATION) {
        universityDetailsHtml = `
          <h3>University Details (Update Information):</h3>
          <p><strong>University Name:</strong> ${universityName}</p>
        `;
        universityDetailsText = `
          University Details (Update Information):
          University Name: ${universityName}
        `;
      }
      // You might add an else block or default if other RequestTypeEnum values exist
      // or if you want to handle unexpected request types.

      const mailOptions = {
        from: `"${name}" <${email}>`,
        to: this._configService.get<string>('CONTACT_FORM_RECEIVER_EMAIL'),
        subject: `UNISCOUT - ${requestType} Request from ${name}`, // Dynamic subject
        html: `
          <h3>Sender's Contact Details:</h3>
          <p><strong>Name:</strong> ${name}</p>
          <p><strong>Email:</strong> ${email}</p>
          <p><strong>Phone Number:</strong> ${phoneNumber}</p>
          <p><strong>Request Type:</strong> ${requestType}</p>
          ${universityDetailsHtml}
          <h3>Message:</h3>
          <p>${message}</p>
        `,
        text: `
          Sender's Contact Details:
          Name: ${name}
          Email: ${email}
          Phone Number: ${phoneNumber}
          Request Type: ${requestType}
          ${universityDetailsText}
          Message:
          ${message}
        `,
        attachments: attachments,
      };

      await this._transporter.sendMail(mailOptions);
      this._logger.log(`Contact form email sent successfully from ${email} for ${requestType} request.`);

      // --- Acknowledgment Email Content Conditionally ---
      let acknowledgmentUniversityDetailsHtml = '';
      let acknowledgmentUniversityDetailsText = '';

      if (requestType === RequestTypeEnum.NEW_UNIVERSITY) {
        acknowledgmentUniversityDetailsHtml = `
          <h3>Submitted University Details:</h3>
          <p><strong>University Name:</strong> ${universityName}</p>
          <p><strong>Country:</strong> ${country}</p>
          <p><strong>Location:</strong> ${location}</p>
          <p><strong>Type:</strong> ${type}</p>
          <p><strong>University Email:</strong> ${universityEmail}</p>
          <p><strong>Website:</strong> <a href="${website}">${website}</a></p>
          <p><strong>Broad Field of Study:</strong> ${broadFieldOfStudy}</p>
          <p><strong>Specific Field of Study:</strong> ${specificFieldOfStudy}</p>
          ${typeof rank === 'number' ? `<p><strong>Rank:</strong> ${rank}</p>` : ''}
          ${
            typeof numberOfStudents === 'number'
              ? `<p><strong>Number of Students:</strong> ${numberOfStudents}</p>`
              : ''
          }
        `;
        acknowledgmentUniversityDetailsText = `
          Submitted University Details:
          University Name: ${universityName}
          Country: ${country}
          Location: ${location}
          Type: ${type}
          University Email: ${universityEmail}
          Website: ${website}
          Broad Field of Study: ${broadFieldOfStudy}
          Specific Field of Study: ${specificFieldOfStudy}
          ${typeof rank === 'number' ? `Rank: ${rank}\n` : ''}
          ${typeof numberOfStudents === 'number' ? `Number of Students: ${numberOfStudents}\n` : ''}
        `;
      } else if (requestType === RequestTypeEnum.UPDATE_INFORMATION) {
        acknowledgmentUniversityDetailsHtml = `
          <h3>Submitted University Details:</h3>
          <p><strong>University Name:</strong> ${universityName}</p>
        `;
        acknowledgmentUniversityDetailsText = `
          Submitted University Details:
          University Name: ${universityName}
        `;
      }

      const acknowledgmentMailOptions = {
        from: `UNISCOUT <${this._configService.get<string>('EMAIL_USER')}>`,
        to: email,
        subject: 'UNISCOUT - We received your message!',
        html: `
          <p>Dear ${name},</p>
          <p>Thank you for contacting UNISCOUT. We have received your message and will get back to you as soon as possible.</p>
          <p>Here's a copy of your submission details:</p>
          <h3>Your Contact Details:</h3>
          <p><strong>Name:</strong> ${name}</p>
          <p><strong>Email:</strong> ${email}</p>
          <p><strong>Phone Number:</strong> ${phoneNumber}</p>
          <p><strong>Request Type:</strong> ${requestType}</p>
          ${acknowledgmentUniversityDetailsHtml}
          <h3>Your Message:</h3>
          <p>${message}</p>
          <p>If you have any urgent queries, feel free to reach out to us directly.</p>
          <p>Best regards,<br>The UNISCOUT Team</p>
        `,
        text: `
          Dear ${name},

          Thank you for contacting UNISCOUT. We have received your message and will get back to you as soon as possible.

          Here's a copy of your submission details:

          Your Contact Details:
          Name: ${name}
          Email: ${email}
          Phone Number: ${phoneNumber}
          Request Type: ${requestType}
          ${acknowledgmentUniversityDetailsText}
          Your Message:
          ${message}

          If you have any urgent queries, feel free to reach out to us directly.

          Best regards,
          The UNISCOUT Team
        `,
      };

      await this._transporter.sendMail(acknowledgmentMailOptions);
      this._logger.log(`Acknowledgment email sent successfully to ${email} for ${requestType} request.`);

      const newSubmission = this._contactSubmissionRepo.create({
        email: email,
        name: name,
        // You might consider conditionally saving more fields to the entity
        // based on the request type if your database schema allows for nulls
        // or if you have different tables for different request types.
        universityName: universityName, // Always stored
        requestType: requestType, // Always stored
        phoneNumber: phoneNumber, // Always stored
        message: message, // Always stored
        ...(requestType === RequestTypeEnum.NEW_UNIVERSITY && {
          country: country,
          location: location,
          type: type,
          universityEmail: universityEmail,
          website: website,
          broadFieldOfStudy: broadFieldOfStudy,
          specificFieldOfStudy: specificFieldOfStudy,
          rank: rank,
          numberOfStudents: numberOfStudents,
        }),
      });
      await this._contactSubmissionRepo.save(newSubmission);

      return { message: 'Contact form submitted successfully!' };
    } catch (error) {
      this._logger.error(
        `Failed to send contact form email from ${senderEmail || 'unknown'} (Type: ${
          createContactDto.requestType || 'unknown'
        }):`,
        error.stack
      );
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

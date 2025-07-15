import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { CreateContactDto } from './dto/create-contact.dto';
import { GetContactSubmissionsDto } from './dto/get-contact.dto';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import * as fs from 'fs';
import * as path from 'path';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindManyOptions, ILike } from 'typeorm';
import { ContactSubmissionEntity, SubmissionStatusEnum } from './entities';
import { RequestTypeEnum } from '@Constant/enums';
import { UpdateContactSubmissionStatusDto } from './dto/update-contact.dto';

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
    const senderEmail = createContactDto.representativeEmail;
    this._logger.log(`Received contact form submission from: ${senderEmail || 'Anonymous'}`);

    try {
      const {
        universityName,
        requestType,
        representativeName,
        representativeEmail,
        representativeNumber,
        message,
        abbreviation,
        country,
        location,
        type,
        universityEmail,
        universityNumber,
        website,
        subjects,
        numberOfStudents,
        description,
      } = createContactDto;

      const attachments = attachmentPaths.map((filePath) => ({
        filename: path.basename(filePath),
        path: filePath,
      }));

      let universityDetailsHtml = '';
      let universityDetailsText = '';
      let contactDetailsHtml = '';
      let contactDetailsText = '';
      let messageHtml = '';
      let messageText = '';

      if (requestType === RequestTypeEnum.NEW_UNIVERSITY) {
        universityDetailsHtml = `
          <h3>University Details (New University):</h3>
          <p><strong>University Name:</strong> ${universityName}</p>
          <p><strong>Abbreviation:</strong> ${abbreviation || 'N/A'}</p>
          <p><strong>Country:</strong> ${country}</p>
          <p><strong>Location:</strong> ${location}</p>
          <p><strong>Type:</strong> ${type}</p>
          <p><strong>University Email:</strong> ${universityEmail}</p>
          <p><strong>University Number:</strong> ${universityNumber || 'N/A'}</p>
          <p><strong>Website:</strong> <a href="${website}">${website}</a></p>
          <p><strong>Subjects:</strong> ${subjects}</p>
          ${
            typeof numberOfStudents === 'number'
              ? `<p><strong>Number of Students:</strong> ${numberOfStudents}</p>`
              : ''
          }
          <p><strong>Description:</strong> ${description || 'N/A'}</p> `;
        universityDetailsText = `
          University Details (New University):
          University Name: ${universityName}
          Abbreviation: ${abbreviation || 'N/A'}
          Country: ${country}
          Location: ${location}
          Type: ${type}
          University Email: ${universityEmail}
          University Number: ${universityNumber || 'N/A'}
          Website: ${website}
          Subjects: ${subjects}
          ${typeof numberOfStudents === 'number' ? `Number of Students: ${numberOfStudents}\n` : ''}
          Description: ${description || 'N/A'}\n `;
        contactDetailsHtml = `
          <h3>Sender's Contact Details:</h3>
          <p><strong>Representative Name:</strong> ${representativeName || 'N/A'}</p>
          <p><strong>Representative Email:</strong> ${representativeEmail || 'N/A'}</p>
          <p><strong>Representative Phone Number:</strong> ${representativeNumber || 'N/A'}</p>
        `;
        contactDetailsText = `
          Sender's Contact Details:
          Representative Name: ${representativeName || 'N/A'}
          Representative Email: ${representativeEmail || 'N/A'}
          Representative Phone Number: ${representativeNumber || 'N/A'}
        `;
      } else {
        universityDetailsHtml = `
          <h3>University Details:</h3>
          <p><strong>University Name:</strong> ${universityName}</p>
        `;
        universityDetailsText = `
          University Details:
          University Name: ${universityName}
        `;
        contactDetailsHtml = `
          <h3>Sender's Contact Details:</h3>
          <p><strong>Representative Name:</strong> ${representativeName}</p>
          <p><strong>Representative Email:</strong> ${representativeEmail}</p>
          <p><strong>Representative Phone Number:</strong> ${representativeNumber}</p>
        `;
        contactDetailsText = `
          Sender's Contact Details:
          Representative Name: ${representativeName}
          Representative Email: ${representativeEmail}
          Representative Phone Number: ${representativeNumber}
        `;
        messageHtml = `
          <h3>Message:</h3>
          <p>${message}</p>
          ${description ? `<p><strong>Description:</strong> ${description}</p>` : ''}
        `;
        messageText = `
          Message:
          ${message}
          ${description ? `Description: ${description}\n` : ''}
        `;
      }

      const mailOptions = {
        from: `"${representativeName || 'Contact Form'}" <${
          representativeEmail || this._configService.get<string>('EMAIL_USER')
        }>`,
        to: this._configService.get<string>('CONTACT_FORM_RECEIVER_EMAIL'),
        subject: `UNISCOUT - ${requestType} Request from ${representativeName || 'Anonymous'}`,
        html: `
          ${contactDetailsHtml}
          <p><strong>Request Type:</strong> ${requestType}</p>
          ${universityDetailsHtml}
          ${messageHtml} `,
        text: `
          ${contactDetailsText}
          Request Type: ${requestType}
          ${universityDetailsText}
          ${messageText} `,
        attachments: attachments,
      };

      await this._transporter.sendMail(mailOptions);
      this._logger.log(
        `Contact form email sent successfully from ${representativeEmail || 'Anonymous'} for ${requestType} request.`
      );

      let acknowledgmentUniversityDetailsHtml = '';
      let acknowledgmentUniversityDetailsText = '';
      let acknowledgmentContactDetailsHtml = '';
      let acknowledgmentContactDetailsText = '';
      let acknowledgmentMessageHtml = '';
      let acknowledgmentMessageText = '';

      if (requestType === RequestTypeEnum.NEW_UNIVERSITY) {
        acknowledgmentUniversityDetailsHtml = `
          <h3>Submitted University Details:</h3>
          <p><strong>University Name:</strong> ${universityName}</p>
          <p><strong>Abbreviation:</strong> ${abbreviation || 'N/A'}</p>
          <p><strong>Country:</strong> ${country}</p>
          <p><strong>Location:</strong> ${location}</p>
          <p><strong>Type:</strong> ${type}</p>
          <p><strong>University Email:</strong> ${universityEmail}</p>
          <p><strong>University Number:</strong> ${universityNumber || 'N/A'}</p>
          <p><strong>Website:</strong> <a href="${website}">${website}</a></p>
          <p><strong>Subjects:</strong> ${subjects}</p>
          ${
            typeof numberOfStudents === 'number'
              ? `<p><strong>Number of Students:</strong> ${numberOfStudents}</p>`
              : ''
          }
          <p><strong>Description:</strong> ${description || 'N/A'}</p> `;
        acknowledgmentUniversityDetailsText = `
          Submitted University Details:
          University Name: ${universityName}
          Abbreviation: ${abbreviation || 'N/A'}
          Country: ${country}
          Location: ${location}
          Type: ${type}
          University Email: ${universityEmail}
          University Number: ${universityNumber || 'N/A'}
          Website: ${website}
          Subjects: ${subjects}
          ${typeof numberOfStudents === 'number' ? `Number of Students: ${numberOfStudents}\n` : ''}
          Description: ${description || 'N/A'}\n `;
        acknowledgmentContactDetailsHtml = `
          <h3>Your Contact Details:</h3>
          <p><strong>Name:</strong> ${representativeName || 'N/A'}</p>
          <p><strong>Email:</strong> ${representativeEmail || 'N/A'}</p>
          <p><strong>Phone Number:</strong> ${representativeNumber || 'N/A'}</p>
        `;
        acknowledgmentContactDetailsText = `
          Your Contact Details:
          Name: ${representativeName || 'N/A'}
          Email: ${representativeEmail || 'N/A'}
          Phone Number: ${representativeNumber || 'N/A'}
        `;
      } else {
        acknowledgmentUniversityDetailsHtml = `
          <h3>Submitted University Details:</h3>
          <p><strong>University Name:</strong> ${universityName}</p>
        `;
        acknowledgmentUniversityDetailsText = `
          Submitted University Details:
          University Name: ${universityName}
        `;
        acknowledgmentContactDetailsHtml = `
          <h3>Your Contact Details:</h3>
          <p><strong>Name:</strong> ${representativeName}</p>
          <p><strong>Email:</strong> ${representativeEmail}</p>
          <p><strong>Phone Number:</strong> ${representativeNumber}</p>
        `;
        acknowledgmentContactDetailsText = `
          Your Contact Details:
          Name: ${representativeName}
          Email: ${representativeEmail}
          Phone Number: ${representativeNumber}
        `;
        acknowledgmentMessageHtml = `
          <h3>Your Message:</h3>
          <p>${message}</p>
          ${description ? `<p><strong>Description:</strong> ${description}</p>` : ''}
        `;
        acknowledgmentMessageText = `
          Your Message:
          ${message}
          ${description ? `Description: ${description}\n` : ''}
        `;
      }

      const acknowledgmentMailOptions = {
        from: `UNISCOUT <${this._configService.get<string>('EMAIL_USER')}>`,
        to: representativeEmail,
        subject: 'UNISCOUT - We received your message!',
        html: `
          <p>Dear ${representativeName || 'Valued User'},</p>
          <p>Thank you for contacting UNISCOUT. We have received your message and will get back to you as soon as possible.</p> <p>Here's a copy of your submission details:</p>
          ${acknowledgmentContactDetailsHtml}
          <p><strong>Request Type:</strong> ${requestType}</p>
          ${acknowledgmentUniversityDetailsHtml}
          ${acknowledgmentMessageHtml} <p>If you have any urgent queries, feel free to reach out to us directly.</p>
          <p>Best regards,<br>The UNISCOUT Team</p>
        `,
        text: `
          Dear ${representativeName || 'Valued User'},

          Thank you for contacting UNISCOUT. We have received your message and will get back to you as soon as possible. Here's a copy of your submission details:

          ${acknowledgmentContactDetailsText}
          Request Type: ${requestType}
          ${acknowledgmentUniversityDetailsText}
          ${acknowledgmentMessageText} If you have any urgent queries, feel free to reach out to us directly.

          Best regards,
          The UNISCOUT Team
        `,
      };

      if (representativeEmail) {
        await this._transporter.sendMail(acknowledgmentMailOptions);
        this._logger.log(
          `Acknowledgment email sent successfully to ${representativeEmail} for ${requestType} request.`
        );
      } else {
        this._logger.warn(
          `No representative email provided for ${requestType} request. Acknowledgment email not sent.`
        );
      }

      const newSubmission = this._contactSubmissionRepo.create({
        representativeEmail: representativeEmail,
        representativeName: representativeName,
        universityName: universityName,
        requestType: requestType,
        representativeNumber: representativeNumber,
        message: message,
        description: description,
        ...(requestType === RequestTypeEnum.NEW_UNIVERSITY && {
          abbreviation: abbreviation,
          country: country,
          location: location,
          type: type,
          universityEmail: universityEmail,
          universityNumber: universityNumber,
          website: website,
          subjects: subjects,
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

  async getContactSubmissions(query: GetContactSubmissionsDto) {
    const {
      page = 1,
      pageSize = 10,
      sortOrder = 'DESC',
      sortBy = 'submittedAt',
      requestType,
      country,
      universityName,
      status,
    } = query;

    const findOptions: FindManyOptions<ContactSubmissionEntity> = {
      take: pageSize,
      skip: (page - 1) * pageSize,
      order: {
        [sortBy]: sortOrder,
      },
      where: {},
    };

    if (requestType) {
      findOptions.where['requestType'] = requestType;
    }
    if (country) {
      findOptions.where['country'] = ILike(`%${country}%`);
    }
    if (universityName) {
      findOptions.where['universityName'] = ILike(`%${universityName}%`);
    }
    if (status) {
      findOptions.where['status'] = status;
    }

    const [submissions, total] = await this._contactSubmissionRepo.findAndCount(findOptions);

    return {
      data: submissions,
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  async getContactSubmissionById(id: number): Promise<ContactSubmissionEntity | undefined> {
    this._logger.log(`Attempting to retrieve contact submission with ID: ${id}`);
    const submission = await this._contactSubmissionRepo.findOneBy({ id });
    if (!submission) {
      this._logger.warn(`Contact submission with ID ${id} not found.`);
    } else {
      this._logger.log(`Contact submission with ID ${id} retrieved successfully.`);
    }
    return submission;
  }

  async updateContactSubmissionStatus(
    id: number,
    updateDto: UpdateContactSubmissionStatusDto
  ): Promise<ContactSubmissionEntity> {
    this._logger.log(`Attempting to update status for contact submission with ID: ${id}`);
    const submission = await this._contactSubmissionRepo.findOneBy({ id });

    if (!submission) {
      throw new HttpException('Contact submission not found.', HttpStatus.NOT_FOUND);
    }

    const currentStatus = submission.status;
    const newStatus = updateDto.status;
    const rejectionReason = updateDto.rejectionReason;

    switch (currentStatus) {
      case SubmissionStatusEnum.PENDING:
        if (
          newStatus !== SubmissionStatusEnum.IN_PROGRESS &&
          newStatus !== SubmissionStatusEnum.COMPLETED &&
          newStatus !== SubmissionStatusEnum.REJECTED
        ) {
          throw new HttpException(
            `Invalid status transition from ${currentStatus} to ${newStatus}.`,
            HttpStatus.BAD_REQUEST
          );
        }
        break;
      case SubmissionStatusEnum.IN_PROGRESS:
        if (newStatus !== SubmissionStatusEnum.COMPLETED && newStatus !== SubmissionStatusEnum.REJECTED) {
          throw new HttpException(
            `Invalid status transition from ${currentStatus} to ${newStatus}.`,
            HttpStatus.BAD_REQUEST
          );
        }
        break;
      case SubmissionStatusEnum.COMPLETED:
      case SubmissionStatusEnum.REJECTED:
        throw new HttpException(`Cannot change status from a final state: ${currentStatus}.`, HttpStatus.BAD_REQUEST);
      default:
        throw new HttpException('Invalid current status.', HttpStatus.BAD_REQUEST);
    }

    if (newStatus === SubmissionStatusEnum.REJECTED) {
      if (!rejectionReason || rejectionReason.length < 10 || rejectionReason.length > 500) {
        throw new HttpException(
          'Rejection reason is required and must be between 10 and 500 characters for Rejected status.',
          HttpStatus.BAD_REQUEST
        );
      }
      submission.rejectionReason = rejectionReason;
    } else {
      submission.rejectionReason = null;
    }

    submission.status = newStatus;
    await this._contactSubmissionRepo.save(submission);
    this._logger.log(`Contact submission with ID ${id} status updated to ${newStatus}.`);
    return submission;
  }
}

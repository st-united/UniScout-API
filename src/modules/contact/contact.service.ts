import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { CreateContactDto } from './dto/create-contact.dto';
import { GetContactSubmissionsDto } from './dto/get-contact.dto';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import * as fs from 'fs';
import * as path from 'path';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Brackets, In } from 'typeorm';
import { ContactSubmissionEntity, SubmissionStatusEnum } from './entities';
import { RequestTypeEnum } from '@Constant/enums';
import { UpdateContactSubmissionStatusDto } from './dto/update-contact.dto';
import { UniEntity } from '@UniversitiesModule/entities';
import { UniversityService } from '@UniversitiesModule/university.service';

@Injectable()
export class ContactService {
  private readonly _logger = new Logger(ContactService.name);
  private _transporter;

  constructor(
    private readonly _configService: ConfigService,
    @InjectRepository(ContactSubmissionEntity)
    private readonly _contactSubmissionRepo: Repository<ContactSubmissionEntity>,
    @InjectRepository(UniEntity)
    private readonly _uniRepository: Repository<UniEntity>,
    private readonly _universityService: UniversityService
  ) {
    const secure = this._configService.get<string>('MAIL_SECURE') === 'true';

    this._transporter = nodemailer.createTransport({
      host: this._configService.get<string>('MAIL_HOST'),
      port: parseInt(this._configService.get<string>('MAIL_PORT') || '587', 10),
      secure,
      requireTLS: !secure,
      auth: {
        user: this._configService.get<string>('MAIL_USER'),
        pass: this._configService.get<string>('MAIL_PASSWORD'),
      },
      tls: {
        minVersion: 'TLSv1.2',
        rejectUnauthorized: false,
      },
    });
  }

  async handleSubmitContactForm(
    createContactDto: CreateContactDto,
    attachmentPaths: string[] = [],
    excelTempFilePath?: string
  ): Promise<{ message: string }> {
    const senderEmail = createContactDto.representativeEmail;
    this._logger.log(`Received contact form submission from: ${senderEmail || 'Anonymous'}`);

    let permanentExcelFilePath: string | undefined;

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
        numberOfStudents,
        description,
      } = createContactDto;

      if (excelTempFilePath && fs.existsSync(excelTempFilePath)) {
        const uploadsDir = path.join(process.cwd(), 'uploads', 'excel-submissions');
        if (!fs.existsSync(uploadsDir)) {
          fs.mkdirSync(uploadsDir, { recursive: true });
        }
        const fileName = `${Date.now()}-${path.basename(excelTempFilePath)}`;
        permanentExcelFilePath = path.join(uploadsDir, fileName);

        fs.renameSync(excelTempFilePath, permanentExcelFilePath);
        this._logger.log(`Moved Excel file from ${excelTempFilePath} to ${permanentExcelFilePath}`);
      }

      const attachments = attachmentPaths.map((filePath) => ({
        filename: path.basename(filePath),
        path: filePath,
      }));

      let universityDetailsHtml = '';
      let universityDetailsText = '';
      let contactDetailsHtml = '';
      let contactDetailsText = '';
      let messageContentHtml = '';
      let messageContentText = '';

      if (requestType === RequestTypeEnum.NEW_UNIVERSITY) {
        universityDetailsHtml = `
          <h3>University Details:</h3>
          <p><strong>University Name:</strong> ${universityName}</p>
          <p><strong>Abbreviation:</strong> ${abbreviation || 'N/A'}</p>
          <p><strong>Country:</strong> ${country || 'N/A'}</p>
          <p><strong>Location:</strong> ${location || 'N/A'}</p>
          <p><strong>Type:</strong> ${type || 'N/A'}</p>
          <p><strong>University Email:</strong> ${universityEmail || 'N/A'}</p>
          <p><strong>University Number:</strong> ${universityNumber || 'N/A'}</p>
          <p><strong>Website:</strong> <a href="${website}">${website}</a></p>
          ${permanentExcelFilePath ? `<p><strong>Subjects Excel File:</strong> Available on server</p>` : ''}
          ${
            typeof numberOfStudents === 'number'
              ? `<p><strong>Number of Students:</strong> ${numberOfStudents}</p>`
              : ''
          }
          ${description ? `<p><strong>Description:</strong> ${description}</p>` : ''}
        `;
        universityDetailsText = `
          University Details:
          University Name: ${universityName}
          Abbreviation: ${abbreviation || 'N/A'}
          Country: ${country || 'N/A'}
          Location: ${location || 'N/A'}
          Type: ${type || 'N/A'}
          University Email: ${universityEmail || 'N/A'}
          University Number: ${universityNumber || 'N/A'}
          Website: ${website}
          Subjects Excel File: ${permanentExcelFilePath ? 'Available on server' : 'N/A'}
          ${typeof numberOfStudents === 'number' ? `Number of Students: ${numberOfStudents}\n` : ''}
          ${description ? `Description: ${description}\n` : ''}
        `;
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
        messageContentHtml = '';
        messageContentText = '';
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
        messageContentHtml = `
          <h3>Message:</h3>
          <p>${message}</p>
        `;
        messageContentText = `
          Message:
          ${message}
        `;
      }

      const mailOptions = {
        from: `"${representativeName || 'Contact Form'}" <${
          representativeEmail || this._configService.get<string>('EMAIL_USER')
        }>`,
        to: this._configService.get<string>('MAIL_CONTACT_FORM_RECEIVER_EMAIL'),
        subject: `UNISCOUT - ${requestType} Request from ${representativeName || 'Anonymous'}`,
        html: `
          <p><strong>Request Type:</strong> ${requestType}</p>
          ${universityDetailsHtml}
          ${contactDetailsHtml}
          ${messageContentHtml}
        `,
        text: `
          Request Type: ${requestType}
          ${universityDetailsText}
          ${contactDetailsText}
          ${messageContentText}
        `,
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
      let acknowledgmentMessageContentHtml = '';
      let acknowledgmentMessageContentText = '';

      if (requestType === RequestTypeEnum.NEW_UNIVERSITY) {
        acknowledgmentUniversityDetailsHtml = `
          <h3>Submitted University Details:</h3>
          <p><strong>University Name:</strong> ${universityName}</p>
          <p><strong>Abbreviation:</strong> ${abbreviation || 'N/A'}</p>
          <p><strong>Country:</strong> ${country || 'N/A'}</p>
          <p><strong>Location:</strong> ${location || 'N/A'}</p>
          <p><strong>Type:</strong> ${type || 'N/A'}</p>
          <p><strong>University Email:</strong> ${universityEmail || 'N/A'}</p>
          <p><strong>University Number:</strong> ${universityNumber || 'N/A'}</p>
          <p><strong>Website:</strong> <a href="${website}">${website}</a></p>
          ${permanentExcelFilePath ? `<p><strong>Subjects Excel File:</strong> Available on server</p>` : ''}
          ${
            typeof numberOfStudents === 'number'
              ? `<p><strong>Number of Students:</strong> ${numberOfStudents}</p>`
              : ''
          }
          ${description ? `<p><strong>Description:</strong> ${description}</p>` : ''}
        `;
        acknowledgmentUniversityDetailsText = `
          Submitted University Details:
          University Name: ${universityName}
          Abbreviation: ${abbreviation || 'N/A'}
          Country: ${country || 'N/A'}
          Location: ${location || 'N/A'}
          Type: ${type || 'N/A'}
          University Email: ${universityEmail || 'N/A'}
          University Number: ${universityNumber || 'N/A'}
          Website: ${website}
          Subjects Excel File: ${permanentExcelFilePath ? 'Available on server' : 'N/A'}
          ${typeof numberOfStudents === 'number' ? `Number of Students: ${numberOfStudents}\n` : ''}
          ${description ? `Description: ${description}\n` : ''}
        `;
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
        acknowledgmentMessageContentHtml = '';
        acknowledgmentMessageContentText = '';
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
        acknowledgmentMessageContentHtml = `
          <h3>Your Message:</h3>
          <p>${message}</p>
        `;
        acknowledgmentMessageContentText = `
          Your Message:
          ${message}
        `;
      }

      const acknowledgmentMailOptions = {
        from: `UNISCOUT <${this._configService.get<string>('MAIL_USER')}>`,
        to: representativeEmail,
        subject: 'UNISCOUT - We received your message!',
        html: `
          <p>Dear ${representativeName || 'Valued User'},</p>
          <p>Thank you for contacting UNISCOUT. We have received your message and will get back to you as soon as possible.</p> <p>Here's a copy of your submission details:</p>
          <p><strong>Request Type:</strong> ${requestType}</p>
          ${acknowledgmentUniversityDetailsHtml}
          ${acknowledgmentContactDetailsHtml}
          ${acknowledgmentMessageContentHtml} <p>If you have any urgent queries, feel free to reach out to us directly.</p>
          <p>Best regards,<br>The UNISCOUT Team</p>
        `,
        text: `
          Dear ${representativeName || 'Valued User'},

          Thank you for contacting UNISCOUT. We have received your message and will get back to you as soon as possible. Here's a copy of your submission details:

          Request Type: ${requestType}
          ${acknowledgmentUniversityDetailsText}
          ${acknowledgmentContactDetailsText}
          ${acknowledgmentMessageContentText} If you have any urgent queries, feel free to reach out to us directly.

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
        ...(requestType === RequestTypeEnum.NEW_UNIVERSITY && {
          abbreviation: abbreviation,
          country: country,
          location: location,
          type: type,
          universityEmail: universityEmail,
          universityNumber: universityNumber,
          website: website,
          subjectsExcelFilePath: path.relative(process.cwd(), permanentExcelFilePath),
          studentPopulation: numberOfStudents,
          description: description,
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
      if (excelTempFilePath && fs.existsSync(excelTempFilePath)) {
        fs.unlink(excelTempFilePath, (err) => {
          if (err)
            this._logger.error(`Failed to delete temporary Excel file: ${excelTempFilePath}, Error: ${err.message}`);
          else this._logger.log(`Successfully deleted temporary Excel file: ${excelTempFilePath}`);
        });
      }
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
      status,
      search,
    } = query;

    const qb = this._contactSubmissionRepo.createQueryBuilder('submission');

    if (requestType) {
      qb.andWhere('submission.requestType = :requestType', { requestType });
    }
    if (country) {
      qb.andWhere('submission.country = :country', { country: country });
    }
    if (status) {
      qb.andWhere('submission.status = :status', { status });
    }

    if (search?.trim()) {
      const searchTerm = search.trim();
      const similarityThreshold = 0.4;

      qb.andWhere(
        new Brackets((qbInner) => {
          qbInner
            .where('submission.universityName ILIKE :exactSearchTerm', { exactSearchTerm: `%${searchTerm}%` })
            .orWhere('submission.abbreviation ILIKE :exactSearchTerm', { exactSearchTerm: `%${searchTerm}%` })
            .orWhere('word_similarity(:searchTerm, submission.universityName) > :similarityThreshold', {
              searchTerm,
              similarityThreshold,
            })
            .orWhere('word_similarity(:searchTerm, submission.abbreviation) > :similarityThreshold', {
              searchTerm,
              similarityThreshold,
            });
        })
      );
      qb.addSelect(`word_similarity(submission.universityName, :searchTerm)`, 'university_name_similarity');
      qb.addSelect(`word_similarity(submission.abbreviation, :searchTerm)`, 'abbreviation_similarity');
    }

    qb.orderBy(`submission.${sortBy}`, sortOrder);

    qb.take(pageSize).skip((page - 1) * pageSize);

    const [submissions, total] = await qb.getManyAndCount();

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

  async getAvailableCountriesForContactForm(): Promise<string[]> {
    return this._universityService.getAllAvailableCountries();
  }
}

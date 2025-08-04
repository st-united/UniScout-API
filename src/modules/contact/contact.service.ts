import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { CreateContactDto } from './dto/create-contact.dto';
import { GetContactSubmissionsDto } from './dto/get-contact.dto';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import * as fs from 'fs';
import * as path from 'path';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Brackets } from 'typeorm';
import { ContactSubmissionEntity, SubmissionStatusEnum } from './entities';
import { RequestTypeEnum } from '@Constant/enums';
import { UpdateContactSubmissionStatusDto } from './dto/update-contact.dto';
import { UniEntity } from '@UniversitiesModule/entities';
import { UniversityService } from '@UniversitiesModule/university.service';
import { ExportContactRequestDto } from './dto/export-contact.dto';
import { parse as json2csv } from 'json2csv';
import * as XLSX from 'xlsx';

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
    this._logger.log(`Received contact form submission`);

    let permanentExcelFilePath: string | undefined;
    const finalAttachmentPaths: string[] = [];

    const permanentAttachmentsDir = path.join(process.cwd(), 'uploads', 'contact_submissions_attachments');
    if (!fs.existsSync(permanentAttachmentsDir)) {
      fs.mkdirSync(permanentAttachmentsDir, { recursive: true });
    }

    const emailAttachments: { filename: string; path: string }[] = [];

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

        emailAttachments.push({
          filename: path.basename(permanentExcelFilePath),
          path: permanentExcelFilePath,
        });
      }

      for (const tempFilePath of attachmentPaths) {
        if (fs.existsSync(tempFilePath)) {
          const fileName = `${Date.now()}-${path.basename(tempFilePath)}`;
          const permanentPath = path.join(permanentAttachmentsDir, fileName);
          fs.renameSync(tempFilePath, permanentPath);
          finalAttachmentPaths.push(path.relative(process.cwd(), permanentPath));
          this._logger.log(`Moved general attachment from ${tempFilePath} to ${permanentPath}`);

          emailAttachments.push({
            filename: path.basename(permanentPath),
            path: permanentPath,
          });
        }
      }

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
          ${permanentExcelFilePath ? `<p><strong>Subjects Excel File:</strong> Submitted </p>` : ''}
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
          Subjects Excel File: ${permanentExcelFilePath ? 'Submitted' : 'N/A'}
          ${typeof numberOfStudents === 'number' ? `Number of Students: ${numberOfStudents}\n` : ''}
          ${description ? `Description: ${description}\n` : ''}
        `;
        contactDetailsHtml = '';
        contactDetailsText = '';
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
        subject: `UNISCOUT - ${requestType} Request`,
        html: `
          <p><strong>Request Type:</strong> ${requestType}</p>
          ${universityDetailsHtml}
          ${requestType !== RequestTypeEnum.NEW_UNIVERSITY ? contactDetailsHtml : ''}
          ${requestType !== RequestTypeEnum.NEW_UNIVERSITY ? messageContentHtml : ''}
        `,
        text: `
          Request Type: ${requestType}
          ${universityDetailsText}
          ${requestType !== RequestTypeEnum.NEW_UNIVERSITY ? contactDetailsText : ''}
          ${requestType !== RequestTypeEnum.NEW_UNIVERSITY ? messageContentText : ''}
        `,
        attachments: emailAttachments,
      };

      await this._transporter.sendMail(mailOptions);
      this._logger.log(`Contact form email sent successfully' for ${requestType} request.`);

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
          ${permanentExcelFilePath ? `<p><strong>Subjects Excel File:</strong> Submitted </p>` : ''}
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
          Subjects Excel File: ${permanentExcelFilePath ? 'Submitted' : 'N/A'}
          ${typeof numberOfStudents === 'number' ? `Number of Students: ${numberOfStudents}\n` : ''}
          ${description ? `Description: ${description}\n` : ''}
        `;
        acknowledgmentContactDetailsHtml = '';
        acknowledgmentContactDetailsText = '';
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
          <p>Thank you for contacting UNISCOUT. We have received your message and will get back to you as soon as possible.</p> <p>Here's a copy of your submission details:</p>
          <p><strong>Request Type:</strong> ${requestType}</p>
          ${requestType === RequestTypeEnum.NEW_UNIVERSITY ? acknowledgmentUniversityDetailsHtml : ''}
          ${requestType !== RequestTypeEnum.NEW_UNIVERSITY ? acknowledgmentContactDetailsHtml : ''}
          ${requestType !== RequestTypeEnum.NEW_UNIVERSITY ? acknowledgmentMessageContentHtml : ''}
          <p>If you have any urgent queries, feel free to reach out to us directly.</p>
          <p>Best regards,<br>The UNISCOUT Team</p>
        `,
        text: `
          Thank you for contacting UNISCOUT. We have received your message and will get back to you as soon as possible. Here's a copy of your submission details:

          Request Type: ${requestType}
          ${requestType === RequestTypeEnum.NEW_UNIVERSITY ? acknowledgmentUniversityDetailsText : ''}
          ${requestType !== RequestTypeEnum.NEW_UNIVERSITY ? acknowledgmentContactDetailsText : ''}
          ${requestType !== RequestTypeEnum.NEW_UNIVERSITY ? acknowledgmentMessageContentText : ''}
          If you have any urgent queries, feel free to reach out to us directly.

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
          subjectsExcelFilePath: permanentExcelFilePath ? path.relative(process.cwd(), permanentExcelFilePath) : null,
          attachmentFilePaths: finalAttachmentPaths,
          studentPopulation: numberOfStudents,
          description: description,
        }),
      });
      await this._contactSubmissionRepo.save(newSubmission);

      return { message: 'Contact form submitted successfully!' };
    } catch (error) {
      this._logger.error(
        `Failed to send contact form email (Type: ${createContactDto.requestType || 'unknown'}):`,
        error.stack
      );
      if (permanentExcelFilePath && fs.existsSync(permanentExcelFilePath)) {
        fs.unlink(permanentExcelFilePath, (err) => {
          if (err)
            this._logger.error(
              `Failed to delete permanent Excel file during error cleanup: ${permanentExcelFilePath}, Error: ${err.message}`
            );
          else
            this._logger.log(
              `Successfully deleted permanent Excel file during error cleanup: ${permanentExcelFilePath}`
            );
        });
      }
      finalAttachmentPaths.forEach((filePath) => {
        const absolutePath = path.join(process.cwd(), filePath);
        if (fs.existsSync(absolutePath)) {
          fs.unlink(absolutePath, (err) => {
            if (err)
              this._logger.error(
                `Failed to delete permanent attachment file during error cleanup: ${absolutePath}, Error: ${err.message}`
              );
            else
              this._logger.log(`Successfully deleted permanent attachment file during error cleanup: ${absolutePath}`);
          });
        }
      });
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
        if (fs.existsSync(filePath)) {
          fs.unlink(filePath, (err) => {
            if (err)
              this._logger.error(`Failed to delete temporary attachment file: ${filePath}, Error: ${err.message}`);
            else this._logger.log(`Successfully deleted temporary attachment file: ${filePath}`);
          });
        }
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

  async countSubmissionsByStatus(
    month?: number,
    year?: number,
    status?: SubmissionStatusEnum
  ): Promise<Array<{ status: SubmissionStatusEnum; count: number }>> {
    const qb = this._contactSubmissionRepo.createQueryBuilder('submission');

    if (year) {
      qb.andWhere('EXTRACT(YEAR FROM submission.submittedAt) = :year', { year });
    }
    if (month) {
      qb.andWhere('EXTRACT(MONTH FROM submission.submittedAt) = :month', { month });
    }
    if (status) {
      qb.andWhere('submission.status = :status', { status });
    }

    qb.select('submission.status', 'status').addSelect('COUNT(*)', 'count').groupBy('submission.status');

    const result = await qb.getRawMany();

    const finalResult: Array<{ status: SubmissionStatusEnum; count: number }> = Object.values(SubmissionStatusEnum).map(
      (s) => ({
        status: s,
        count: 0,
      })
    );

    result.forEach((row) => {
      const index = finalResult.findIndex((item) => item.status === row.status);
      if (index !== -1) {
        finalResult[index].count = parseInt(row.count, 10);
      }
    });

    return finalResult;
  }

  async exportContactRequests(dto: ExportContactRequestDto): Promise<Buffer> {
    const qb = this._contactSubmissionRepo.createQueryBuilder('submission');

    if (dto.status) qb.andWhere('submission.status = :status', { status: dto.status });
    if (dto.requestType) qb.andWhere('submission.requestType = :requestType', { requestType: dto.requestType });
    if (dto.country) qb.andWhere('submission.country = :country', { country: dto.country });
    if (dto.search?.trim()) {
      const term = `%${dto.search.trim()}%`;
      qb.andWhere('(submission.universityName ILIKE :term OR submission.abbreviation ILIKE :term)', { term });
    }

    const data = await qb.getMany();

    const allFields = [
      'id',
      'requestType',
      'universityName',
      'representativeName',
      'representativeEmail',
      'representativeNumber',
      'message',
      'abbreviation',
      'country',
      'location',
      'type',
      'universityEmail',
      'universityNumber',
      'website',
      'numberOfStudents',
      'description',
      'submittedAt',
      'status',
      'rejectionReason',
    ];

    const selected = dto.fields?.length ? dto.fields : allFields;

    const filteredData = data.map((item) => {
      const out = {};
      for (const field of selected) {
        out[field] = item[field];
      }
      return out;
    });

    if (dto.format === 'xlsx') {
      const ws = XLSX.utils.json_to_sheet(filteredData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Requests');
      return XLSX.write(wb, { bookType: 'xlsx', type: 'buffer' });
    }

    const csv = json2csv(filteredData);
    return Buffer.from(csv, 'utf-8');
  }
}

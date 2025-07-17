import {
  Body,
  Controller,
  Post,
  HttpStatus,
  HttpException,
  UseInterceptors,
  UploadedFiles,
  Get,
  Res,
  Param,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { ContactService } from './contact.service';
import { CreateContactDto } from './dto/create-contact.dto';
import { validate } from 'class-validator';
import { plainToClass } from 'class-transformer';
import * as path from 'path';
import * as fs from 'fs';
import * as multer from 'multer';
import { ApiConsumes, ApiBody, ApiOperation, ApiTags, ApiParam, ApiResponse } from '@nestjs/swagger';
import { RequestTypeEnum } from '@Constant/enums';
import { Response } from 'express';
import { join } from 'path';
import { existsSync } from 'fs';

const uploadDir = './uploads/contact_attachments';
const tempExcelUploadDir = './uploads/excel_temp';

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

if (!fs.existsSync(tempExcelUploadDir)) {
  fs.mkdirSync(tempExcelUploadDir, { recursive: true });
}

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const MAX_ATTACHMENT_FILES = 5;

@Controller('contact')
export class ContactController {
  constructor(private readonly _contactService: ContactService) {}

  @Post()
  @ApiOperation({ summary: 'Submit contact form' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        requestType: { type: 'string', enum: Object.values(RequestTypeEnum) },
        universityName: { type: 'string' },

        representativeName: { type: 'string', nullable: true },
        representativeEmail: { type: 'string', format: 'email', nullable: true },
        representativeNumber: { type: 'string', nullable: true },
        message: { type: 'string', nullable: true },

        abbreviation: { type: 'string', nullable: true },
        country: { type: 'string', nullable: true },
        location: { type: 'string', nullable: true },
        type: { type: 'string', nullable: true },
        universityEmail: { type: 'string', format: 'email', nullable: true },
        universityNumber: { type: 'string', nullable: true },
        website: { type: 'string', format: 'url', nullable: true },
        numberOfStudents: { type: 'integer', nullable: true },
        description: { type: 'string', nullable: true },

        files: {
          type: 'array',
          items: {
            type: 'string',
            format: 'binary',
          },
          maxItems: MAX_ATTACHMENT_FILES,
          description: 'General attachments (PDF, Word, images) up to 5MB each',
        },
        subjectsExcel: {
          type: 'string',
          format: 'binary',
          description: 'Excel file (.xlsx, .xls) for subjects, up to 5MB',
        },
      },
      required: ['requestType', 'universityName'],
    },
  })
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'files', maxCount: MAX_ATTACHMENT_FILES },
        { name: 'subjectsExcel', maxCount: 1 },
      ],
      {
        limits: { fileSize: MAX_FILE_SIZE },
        fileFilter: (req, file, callback) => {
          if (file.fieldname === 'files') {
            const allowedMimeTypes = [
              'application/pdf',
              'application/msword',
              'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
              'image/jpeg',
              'image/png',
              'image/gif',
            ];
            if (!allowedMimeTypes.includes(file.mimetype)) {
              return callback(
                new HttpException(
                  'Only PDF, Word documents, and image files are allowed for general attachments!',
                  HttpStatus.BAD_REQUEST
                ),
                false
              );
            }
          } else if (file.fieldname === 'subjectsExcel') {
            const allowedMimeTypes = [
              'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
              'application/vnd.ms-excel',
            ];
            if (!allowedMimeTypes.includes(file.mimetype)) {
              return callback(
                new HttpException('Only .xlsx and .xls Excel files are allowed for subjects!', HttpStatus.BAD_REQUEST),
                false
              );
            }
          }
          callback(null, true);
        },
        storage: multer.diskStorage({
          destination: (req, file, cb) => {
            if (file.fieldname === 'files') {
              cb(null, uploadDir);
            } else if (file.fieldname === 'subjectsExcel') {
              cb(null, tempExcelUploadDir);
            } else {
              cb(new HttpException('Invalid field name for file upload.', HttpStatus.BAD_REQUEST), '');
            }
          },
          filename: (req, file, cb) => {
            const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
            cb(null, `${file.fieldname}-${uniqueSuffix}${path.extname(file.originalname)}`);
          },
        }),
      }
    )
  )
  async submitContactForm(
    @Body() body: any,
    @UploadedFiles() files: { files?: Express.Multer.File[]; subjectsExcel?: Express.Multer.File[] }
  ) {
    let attachmentPaths: string[] = [];
    let tempExcelFilePath: string | undefined;

    try {
      const createContactData: Partial<CreateContactDto> = {
        requestType: body.requestType,
        universityName: body.universityName,

        representativeName: body.representativeName,
        representativeEmail: body.representativeEmail,
        representativeNumber: body.representativeNumber,
        message: body.message,

        abbreviation: body.abbreviation,
        country: body.country,
        location: body.location,
        type: body.type,
        universityEmail: body.universityEmail,
        universityNumber: body.universityNumber,
        website: body.website,
        numberOfStudents: body.numberOfStudents ? parseInt(body.numberOfStudents, 10) : undefined,
        description: body.description,
      };

      const createContactDto = plainToClass(CreateContactDto, createContactData);

      const errors = await validate(createContactDto);
      if (errors.length > 0) {
        const errorMessages = errors.map((error) => Object.values(error.constraints || {}).join(', ')).join('; ');

        throw new HttpException(
          {
            statusCode: HttpStatus.BAD_REQUEST,
            message: errorMessages,
            error: 'Bad Request',
          },
          HttpStatus.BAD_REQUEST
        );
      }

      if (files?.files && files.files.length > 0) {
        attachmentPaths = files.files.map((file) => file.path);
      }

      if (files?.subjectsExcel && files.subjectsExcel.length > 0) {
        tempExcelFilePath = files.subjectsExcel[0].path;
      }

      if (createContactDto.requestType === RequestTypeEnum.NEW_UNIVERSITY && !tempExcelFilePath) {
        throw new HttpException(
          'An Excel file with subjects is required for New University requests.',
          HttpStatus.BAD_REQUEST
        );
      }

      const result = await this._contactService.handleSubmitContactForm(
        createContactDto,
        attachmentPaths,
        tempExcelFilePath
      );
      return result;
    } catch (error) {
      if (attachmentPaths.length > 0) {
        attachmentPaths.forEach((filePath) => {
          fs.unlink(filePath, (err) => {
            if (err)
              console.error(
                `Failed to delete temporary attachment file during error cleanup: ${filePath}, Error: ${err.message}`
              );
          });
        });
      }
      if (tempExcelFilePath && fs.existsSync(tempExcelFilePath)) {
        fs.unlink(tempExcelFilePath, (err) => {
          if (err)
            console.error(
              `Failed to delete temporary Excel file during error cleanup: ${tempExcelFilePath}, Error: ${err.message}`
            );
        });
      }

      if (error instanceof multer.MulterError) {
        throw new HttpException(
          {
            statusCode: HttpStatus.BAD_REQUEST,
            message: `File upload error: ${error.message}`,
            error: 'Bad Request',
          },
          HttpStatus.BAD_REQUEST
        );
      }

      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        {
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'Failed to send contact message.',
          error: error.message || 'Internal Server Error',
        },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get('template/:filename')
  @ApiOperation({ summary: 'Download template' })
  @ApiParam({ name: 'filename', description: 'Name of the Excel template file (e.g., Subjects_Template.xlsx)' })
  @ApiResponse({
    status: 200,
    description: 'Excel template file downloaded successfully',
    content: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': {
        schema: { type: 'string', format: 'binary' },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'File not found' })
  async downloadExcelTemplate(@Param('filename') filename: string, @Res() res: Response) {
    const filePath = join(__dirname, '..', '..', '..', 'public', filename);

    if (!existsSync(filePath)) {
      throw new HttpException('Excel template file not found.', HttpStatus.NOT_FOUND);
    }

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.sendFile(filePath);
  }
}

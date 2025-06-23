import { Body, Controller, Post, HttpStatus, HttpException, UseInterceptors, UploadedFiles } from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { ContactService } from './contact.service';
import { CreateContactDto } from './dto/create-contact.dto';
import { validate } from 'class-validator';
import { plainToClass } from 'class-transformer';
import * as path from 'path';
import * as fs from 'fs';
import * as multer from 'multer';

const uploadDir = './uploads/contact_attachments';

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const MAX_FILES = 5;

@Controller('contact')
export class ContactController {
  constructor(private readonly _contactService: ContactService) {}

  @Post()
  @UseInterceptors(
    FilesInterceptor('files', MAX_FILES, {
      limits: { fileSize: MAX_FILE_SIZE },
      fileFilter: (req, file, callback) => {
        const allowedMimeTypes = [
          'application/pdf',
          'application/msword', // .doc
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
          'image/jpeg',
          'image/png',
          'image/gif',
        ];
        if (!allowedMimeTypes.includes(file.mimetype)) {
          return callback(
            new HttpException('Only PDF, Word documents, and image files are allowed!', HttpStatus.BAD_REQUEST),
            false
          );
        }
        callback(null, true);
      },
      storage: multer.diskStorage({
        destination: (req, file, cb) => {
          cb(null, uploadDir);
        },
        filename: (req, file, cb) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
          cb(null, `${file.fieldname}-${uniqueSuffix}${path.extname(file.originalname)}`);
        },
      }),
    })
  )
  async submitContactForm(@Body() body: any, @UploadedFiles() files?: Array<Express.Multer.File>) {
    let attachmentPaths: string[] = [];

    try {
      const createContactData: Partial<CreateContactDto> = {
        name: body.name,
        email: body.email,
        message: body.message,
        country: body.country,
        universityName: body.universityName,
        phoneNumber: body.phoneNumber,
        requestType: body.requestType,
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

      // Handle optional file attachments
      if (files && files.length > 0) {
        attachmentPaths = files.map((file) => file.path);
      }

      const result = await this._contactService.handleSubmitContactForm(createContactDto, attachmentPaths);
      return result;
    } catch (error) {
      if (attachmentPaths.length > 0) {
        attachmentPaths.forEach((filePath) => {
          fs.unlink(filePath, (err) => {
            if (err)
              console.error(`Failed to delete temporary file during error cleanup: ${filePath}, Error: ${err.message}`);
          });
        });
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
}

import { Body, Controller, Post, HttpStatus, HttpException, UseInterceptors, UploadedFiles } from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { ContactService } from './contact.service';
import { CreateContactDto } from './dto/create-contact.dto';
import { validate } from 'class-validator';
import { plainToClass } from 'class-transformer';
import * as path from 'path';
import * as fs from 'fs';
import * as multer from 'multer';
import { ApiConsumes, ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger'; // Import Swagger decorators
import { RequestTypeEnum } from '@Constant/enums';

const uploadDir = './uploads/contact_attachments';

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const MAX_FILES = 5;

@ApiTags('Contact') // Optional: Tag your controller for better organization in Swagger
@Controller('contact')
export class ContactController {
  constructor(private readonly _contactService: ContactService) {}

  @Post()
  @ApiOperation({ summary: 'Submit a contact form with optional file attachments' }) // Optional: Describe the operation
  @ApiConsumes('multipart/form-data') // Crucial for file uploads in Swagger
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        email: { type: 'string', format: 'email' },
        message: { type: 'string' },
        requestType: { type: 'string', enum: Object.values(RequestTypeEnum) }, // Use Object.values for enum
        universityName: { type: 'string' },
        phoneNumber: { type: 'string' },
        country: { type: 'string', nullable: true }, // Mark as nullable if optional
        location: { type: 'string', nullable: true },
        type: { type: 'string', nullable: true },
        universityEmail: { type: 'string', format: 'email', nullable: true },
        website: { type: 'string', format: 'url', nullable: true },
        broadFieldOfStudy: { type: 'string', nullable: true },
        specificFieldOfStudy: { type: 'string', nullable: true },
        rank: { type: 'integer', nullable: true },
        numberOfStudents: { type: 'integer', nullable: true },
        files: {
          type: 'array',
          items: {
            type: 'string',
            format: 'binary',
          },
          maxItems: MAX_FILES,
          description: 'Optional files (PDF, Word, images) up to 5MB each',
        },
      },
      // You can add 'required' array here if you want to explicitly mark required fields
      // For example, if 'requestType' makes some fields conditionally required,
      // Swagger won't dynamically show/hide them based on 'requestType'.
      // The validation pipe will handle the actual runtime validation.
      required: ['name', 'email', 'message', 'requestType', 'universityName', 'phoneNumber'],
    },
  })
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
        requestType: body.requestType,

        universityName: body.universityName,
        phoneNumber: body.phoneNumber,
        country: body.country,
        location: body.location,
        type: body.type,
        universityEmail: body.universityEmail,
        website: body.website,
        broadFieldOfStudy: body.broadFieldOfStudy,
        specificFieldOfStudy: body.specificFieldOfStudy,

        rank: body.rank ? parseInt(body.rank, 10) : undefined,
        numberOfStudents: body.numberOfStudents ? parseInt(body.numberOfStudents, 10) : undefined,
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

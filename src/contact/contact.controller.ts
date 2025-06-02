import {Body,Controller,Post,HttpStatus,HttpException, UseInterceptors, UploadedFiles, 
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express'; 
import { ContactService } from './contact.service';
import { CreateContactDto } from './dto/create-contact.dto';
import { Express } from 'express'; 
import * as path from 'path'; 
import * as fs from 'fs'; 
import * as multer from 'multer';


const uploadDir = './uploads/contact_attachments';


if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; 
const MAX_FILES = 5; 

@Controller('api/contact')
export class ContactController {
  constructor(private readonly contactService: ContactService) {}

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
          return callback(new HttpException('Only PDF, Word documents, and image files are allowed!', HttpStatus.BAD_REQUEST), false);
        }
        callback(null, true);
      },
      storage:multer.diskStorage({
        destination: (req, file, cb) => {
          cb(null, uploadDir); // Save files to the specified directory
        },
        filename: (req, file, cb) => {
          // Generate a unique filename to prevent overwrites
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
          cb(null, `${file.fieldname}-${uniqueSuffix}${path.extname(file.originalname)}`);
        },
      }),
    }),
  )
  async submitContactForm(
    @Body() createContactDto: CreateContactDto,
    @UploadedFiles() files: Array<Express.Multer.File>, // Inject uploaded files here
  ) {
    let attachmentPaths: string[] = []; // To store paths of successfully uploaded files

    try {
      if (files && files.length > 0) {
        // Extract the paths of the uploaded files from Multer's output
        attachmentPaths = files.map(file => file.path);
      }

      // Pass the DTO data and the attachment paths to the service
      // The service will then handle sending the email and cleaning up the files.
      const result = await this.contactService.handleSubmitContactForm(createContactDto, attachmentPaths);
      return result; // NestJS handles JSON response and 200 OK status
    } catch (error) {
      // --- IMPORTANT: Clean up uploaded files if an error occurs before the service handles them ---
      // (The service has its own cleanup, but this is a safeguard for controller-level errors)
      if (attachmentPaths.length > 0) {
        attachmentPaths.forEach(filePath => {
          fs.unlink(filePath, (err) => {
            if (err) console.error(`Failed to delete temporary file during error cleanup: ${filePath}, Error: ${err.message}`);
          });
        });
      }
      // Use NestJS's HttpException for consistent error handling
      throw new HttpException(
        {
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'Failed to send contact message.',
          error: error.message || 'Internal Server Error',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
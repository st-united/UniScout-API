import {
  Controller,
  Get,
  Query,
  ValidationPipe,
  NotFoundException,
  Param,
  ParseIntPipe,
  BadRequestException,
  Body,
  Post,
  Patch,
  UploadedFile,
  UseInterceptors,
  Delete,
  Logger,
  UsePipes,
  Req,
  Res,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
  HttpStatus,
  UploadedFiles,
} from '@nestjs/common';
import { FileFieldsInterceptor, FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { plainToInstance } from 'class-transformer';
import { Response } from 'express';
import { Readable } from 'stream';
import { Express } from 'express';

import { UniversityService } from './university.service';
import { GetUniversityDto } from './dto/get-university.dto';
import { UniversityDto } from './dto/university.dto';
import { CreateUniversityDto } from './dto/create-university.dto';
import { UpdateUniversityDto } from './dto/update-university.dto';
import { ExportUniversityDto } from './dto/export-university.dto';
import { ConfirmDeleteDto } from './dto/confirm-delete.dto';
import { ApiOperation, ApiConsumes, ApiBody, getSchemaPath } from '@nestjs/swagger';

@Controller('admin/universities')
export class AdminController {
  private readonly _logger = new Logger(AdminController.name);

  constructor(private readonly _universityService: UniversityService) {}

  @Get()
  @ApiOperation({ summary: 'View universities (Admin)' })
  @UsePipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    })
  )
  async findAllForAdmin(@Query() query: GetUniversityDto, @Req() req: any) {
    this._logger.log('Raw Query Params (req.query) for Admin List:', req.query);
    this._logger.log('Transformed Query DTO (query) for Admin List:', query);

    const { universities, totalCount, currentPage, limit } = await this._universityService.findAll(query, true);

    if (!universities || universities.length === 0) {
      return {
        message: 'No universities match the selected criteria for admin view.',
        data: [],
        totalCount: 0,
        currentPage: currentPage,
        limit: limit,
      };
    }
    return {
      message: 'Universities retrieved successfully for admin view.',
      data: universities.map((uni) => plainToInstance(UniversityDto, uni, { excludeExtraneousValues: true })),
      totalCount: totalCount,
      currentPage: currentPage,
      limit: limit,
    };
  }

  @Get('export')
  @ApiOperation({ summary: 'Export universities (Admin)' })
  @UsePipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    })
  )
  async exportUniversities(@Query() query: ExportUniversityDto, @Res() res: Response) {
    try {
      const { format, ...filters } = query;
      const { data, filename, contentType } = await this._universityService.exportUniversities(filters, format);

      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

      const readableStream = new Readable();
      readableStream.push(data);
      readableStream.push(null);

      readableStream.pipe(res);
    } catch (error) {
      this._logger.error(`Export failed: ${error.message}`, error.stack);
      throw new BadRequestException('Export failed. Please try again later.');
    }
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get university by ID (Admin)' })
  async getUniversity(@Param('id', ParseIntPipe) id: number) {
    const university = await this._universityService.getUniversity(id);
    if (!university) {
      throw new NotFoundException(`University with ID ${id} not found.`);
    }
    return plainToInstance(UniversityDto, university, {
      excludeExtraneousValues: true,
    });
  }

  // Create University
  @Post()
  @ApiOperation({ summary: 'Create a new university (Admin)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      allOf: [
        { $ref: getSchemaPath(CreateUniversityDto) },
        {
          properties: {
            logo: {
              type: 'string',
              format: 'binary',
              description: 'University logo image file (max 5MB, jpeg/png/gif/webp)',
            },
            subjectsExcel: {
              type: 'string',
              format: 'binary',
              description: 'Excel file for subjects (xlsx/xls)',
            },
          },
        },
      ],
    },
  })
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        {
          name: 'logo',
          maxCount: 1,
        },
        {
          name: 'subjectsExcel',
          maxCount: 1,
        },
      ],
      {
        storage: diskStorage({
          destination: (req, file, cb) => {
            if (file.fieldname === 'logo') {
              cb(null, './uploads/university-logos');
            } else {
              cb(null, './uploads/temp');
            }
          },
          filename: (req, file, cb) => {
            const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
            cb(null, `${file.fieldname}-${uniqueSuffix}${extname(file.originalname)}`);
          },
        }),
        fileFilter: (req, file, cb) => {
          if (file.fieldname === 'subjectsExcel') {
            if (
              file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
              file.mimetype === 'application/vnd.ms-excel'
            ) {
              cb(null, true);
            } else {
              cb(new BadRequestException('Only Excel files are allowed!'), false);
            }
          } else {
            cb(null, true);
          }
        },
        limits: { fileSize: 20 * 1024 * 1024 },
      }
    )
  )
  async create(
    @Body(new ValidationPipe({ transform: true, whitelist: true })) createDto: CreateUniversityDto,
    @UploadedFiles()
    files: {
      logo?: Express.Multer.File[];
      subjectsExcel?: Express.Multer.File[];
    }
  ) {
    const logoFile = files.logo?.[0];
    const subjectsExcelFile = files.subjectsExcel?.[0];

    if (logoFile) {
      createDto.logo = logoFile.path;
    }

    if (subjectsExcelFile) {
      createDto.subjectsExcelFilePath = subjectsExcelFile.path;
    }

    const createdUniversity = await this._universityService.create(createDto);
    return plainToInstance(UniversityDto, createdUniversity, { excludeExtraneousValues: true });
  }

  // Update University
  @Patch(':id')
  @ApiOperation({ summary: 'Edit university details (Admin)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      allOf: [
        { $ref: getSchemaPath(UpdateUniversityDto) },
        {
          properties: {
            logo: {
              type: 'string',
              format: 'binary',
              description:
                'University logo image file (max 5MB, jpeg/png/gif/webp). Send "null" or empty string in body to remove existing logo.',
            },
            subjectsExcel: {
              type: 'string',
              format: 'binary',
              description: 'Excel file for subjects (xlsx/xls)',
            },
          },
        },
      ],
    },
  })
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'logo', maxCount: 1 },
        { name: 'subjectsExcel', maxCount: 1 },
      ],
      {
        storage: diskStorage({
          destination: (req, file, cb) => {
            if (file.fieldname === 'logo') {
              cb(null, './uploads/university-logos');
            } else {
              cb(null, './uploads/temp');
            }
          },
          filename: (req, file, cb) => {
            const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
            cb(null, `${file.fieldname}-${uniqueSuffix}${extname(file.originalname)}`);
          },
        }),
        fileFilter: (req, file, cb) => {
          if (file.fieldname === 'subjectsExcel') {
            if (
              file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
              file.mimetype === 'application/vnd.ms-excel'
            ) {
              cb(null, true);
            } else {
              cb(new BadRequestException('Only Excel files are allowed for subjects import!'), false);
            }
          } else {
            cb(null, true);
          }
        },
        limits: { fileSize: 20 * 1024 * 1024 },
      }
    )
  )
  async updateUniversity(
    @Param('id', ParseIntPipe) id: number,
    @Body(new ValidationPipe({ transform: true, whitelist: true, skipMissingProperties: true }))
    updateDto: UpdateUniversityDto,
    @UploadedFiles()
    files: {
      logo?: Express.Multer.File[];
      subjectsExcel?: Express.Multer.File[];
    }
  ) {
    this._logger.log('Received request to update university with possible file uploads.');

    const logoFile = files.logo?.[0];
    const subjectsExcelFile = files.subjectsExcel?.[0];

    if (logoFile) {
      updateDto.logo = logoFile.path;
      this._logger.log(`New logo uploaded to: ${updateDto.logo}`);
    } else if (updateDto.logo === null || updateDto.logo === '') {
      updateDto.logo = null;
    }

    if (subjectsExcelFile) {
      updateDto.subjectsExcelFilePath = subjectsExcelFile.path;
    }

    const updatedUniversity = await this._universityService.updateUniversity(id, updateDto);
    if (!updatedUniversity) {
      throw new NotFoundException(`University with ID ${id} not found.`);
    }

    return plainToInstance(UniversityDto, updatedUniversity, {
      excludeExtraneousValues: true,
    });
  }

  // Delete University
  @Delete(':id')
  @ApiOperation({ summary: 'Delete university (Admin)' })
  async deleteUniversity(@Param('id', ParseIntPipe) id: number, @Body() confirmDeleteDto: ConfirmDeleteDto) {
    if (!confirmDeleteDto.confirm_deletion) {
      throw new BadRequestException('Deletion must be confirmed by setting confirm_deletion to true.');
    }

    const result = await this._universityService.deleteUniversity(id);

    if (!result.success) {
      throw new BadRequestException(result.message);
    }
    return {
      message: result.message,
      deleted: true,
    };
  }
}

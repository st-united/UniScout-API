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
  UseGuards,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { plainToInstance } from 'class-transformer';
import { Response } from 'express';
import { Readable } from 'stream';

import { UniversityService } from './university.service';
import { GetUniversityDto } from './dto/get-university.dto';
import { UniversityDto } from './dto/university.dto';
import { CreateUniversityDto } from './dto/create-university.dto';
import { UpdateUniversityDto } from './dto/update-university.dto';
import { ExportUniversityDto } from './dto/export-university.dto';
import { ConfirmDeleteDto } from './dto/confirm-delete.dto';
import { ApiOperation } from '@nestjs/swagger';

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

    const { universities, totalCount, currentPage, limit } = await this._universityService.findAll(query, req.ip, true);

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
  async getUniversity(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    const university = await this._universityService.getUniversity(id, req.ip);
    if (!university) {
      throw new NotFoundException(`University with ID ${id} not found.`);
    }
    return plainToInstance(UniversityDto, university, {
      excludeExtraneousValues: true,
    });
  }

  // Create University
  @Post()
  @ApiOperation({ summary: 'Create university (Admin)' })
  @UseInterceptors(
    FileInterceptor('logo', {
      storage: diskStorage({
        destination: './uploads/university',
        filename: (req, file, cb) => {
          const randomName = Array(32)
            .fill(null)
            .map(() => Math.round(Math.random() * 16).toString(16))
            .join('');
          return cb(null, `${randomName}${extname(file.originalname)}`);
        },
      }),
    })
  )
  async create(
    @Body(new ValidationPipe({ transform: true, whitelist: true })) createDto: CreateUniversityDto,
    @UploadedFile() logo: Express.Multer.File
  ) {
    if (!logo) {
      throw new BadRequestException('Logo file is required.');
    }
    const createdUniversity = await this._universityService.create({
      ...createDto,
      logo: logo.filename,
    });
    return plainToInstance(UniversityDto, createdUniversity, {
      excludeExtraneousValues: true,
    });
  }

  // Update University
  @Patch(':id')
  @ApiOperation({ summary: 'Edit university details (Admin)' })
  @UseInterceptors(
    FileInterceptor('logo', {
      storage: diskStorage({
        destination: './uploads/university',
        filename: (req, file, cb) => {
          const randomName = Array(32)
            .fill(null)
            .map(() => Math.round(Math.random() * 16).toString(16))
            .join('');
          return cb(null, `${randomName}${extname(file.originalname)}`);
        },
      }),
    })
  )
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body(new ValidationPipe({ transform: true, whitelist: true, skipMissingProperties: true }))
    updateDto: UpdateUniversityDto,
    @UploadedFile() logo?: Express.Multer.File
  ) {
    const universityData = { ...updateDto };
    if (logo) {
      (universityData as any).logo = logo.filename;
    }
    const updatedUniversity = await this._universityService.updateUniversity(id, universityData);
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

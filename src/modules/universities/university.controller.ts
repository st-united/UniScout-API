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
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { plainToInstance } from 'class-transformer';

import { UniversityService } from './university.service';
import { GetUniversityDto } from './dto/get-university.dto';
import { UniversityDto } from './dto/university.dto';
import { CreateUniversityDto } from './dto/create-university.dto';
import { UpdateUniversityDto } from './dto/update-university.dto';

@Controller('universities')
export class UniversityController {
  private readonly _logger = new Logger(UniversityController.name);

  constructor(private readonly _universityService: UniversityService) {}

  //View University
  @Get()
  @UsePipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    })
  )
  async findAll(@Query() query: GetUniversityDto, @Req() req: any) {
    this._logger.log('Raw Query Params (req.query):', req.query);
    this._logger.log('Transformed Query DTO (query):', query);
    this._logger.log('Query.fields (after transform):', query.fields);

    const { universities, totalCount, currentPage, limit } = await this._universityService.findAll(query, req.ip);

    if (!universities || universities.length === 0) {
      return {
        message: 'No universities match the selected criteria.',
        data: [],
        totalCount: 0,
        currentPage: currentPage,
        limit: limit,
      };
    }
    return {
      message: 'Universities retrieved successfully.',
      data: universities.map((uni) => plainToInstance(UniversityDto, uni, { excludeExtraneousValues: true })),
      totalCount: totalCount,
      currentPage: currentPage,
      limit: limit,
    };
  }

  @Get(':id')
  async getUniversity(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    const university = await this._universityService.getUniversity(id, req.ip);
    if (!university) {
      throw new NotFoundException(`University with ID ${id} not found.`);
    }
    return plainToInstance(UniversityDto, university, {
      excludeExtraneousValues: true,
    });
  }

  //Create University
  @Post()
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

  //Update University
  @Patch(':id')
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
    return plainToInstance(UniversityDto, updatedUniversity.data, {
      excludeExtraneousValues: true,
    });
  }

  //Delete University
  @Delete(':id')
  async deleteUniversity(@Param('id', ParseIntPipe) id: number, @Body('confirm_deletion') confirmDeletion: boolean) {
    if (!confirmDeletion) {
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

import {
  Controller,
  Post,
  Body,
  Get,
  UseGuards,
  Query,
  Delete,
  Patch,
  Param,
  NotFoundException,
  BadRequestException,
  Logger,
  ParseIntPipe,
  UseInterceptors,
  UploadedFile,
  ValidationPipe,
  UsePipes,
  Res,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { plainToInstance } from 'class-transformer';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { Response } from 'express';
import { Readable } from 'stream';

import { JwtAccessTokenGuard } from '@AuthModule/guards/jwt-access-token.guard';
import { RolesGuard } from '@Guards/roles.guard';
import { Roles } from '@Decorators/roles.decorator';
import { UserRole } from '@Constant/enums';
import { CurrentUser } from '@AuthModule/decorators/current-user.decorator';
import { UserEntity } from '@UsersModule/entities';

import { UniversityService } from './university.service';
import { CreateUniversityDto } from './dto/create-university.dto';
import { UpdateUniversityDto } from './dto/update-university.dto';
import { GetUniversityDto } from './dto/get-university.dto';
import { UniversityDto } from './dto/university.dto';
import { ExportUniversityDto } from './dto/export-university.dto';

@Controller('universities')
export class UniversityController {
  private readonly logger = new Logger(UniversityController.name);

  constructor(private readonly universityService: UniversityService) {}

  @Post()
  @UseGuards(JwtAccessTokenGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @UseInterceptors(
    FileInterceptor('logo', {
      storage: diskStorage({
        destination: './uploads',
        filename: (req, file, cb) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
          const ext = extname(file.originalname);
          cb(null, `logo-${uniqueSuffix}${ext}`);
        },
      }),
      fileFilter: (req, file, callback) => {
        if (!file.mimetype.match(/\/(jpg|jpeg|png|gif)$/)) {
          return callback(new BadRequestException('Only image files are allowed (jpg, jpeg, png, gif)!'), false);
        }
        callback(null, true);
      },
      limits: { fileSize: 2 * 1024 * 1024 }, // 2MB limit
    })
  )
  async create(
    @UploadedFile() logoFile: Express.Multer.File,
    @Body() dto: CreateUniversityDto,
    @CurrentUser() user: UserEntity
  ) {
    this.logger.log(`User ${user.id} is creating a university in ${dto.country}`);

    if (!logoFile) {
      throw new BadRequestException('Logo file is required');
    }

    const logoUrl = `${process.env.APP_URL || 'http://localhost:6002'}/uploads/${logoFile.filename}`;

    return this.universityService.create({ ...dto, logo: logoUrl });
  }

  @Get()
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async findAll(@Query() query: GetUniversityDto) {
    const universities = await this.universityService.findAll(query);

    if (universities.length === 0) {
      return {
        message: 'No universities match the selected criteria.',
        data: [],
      };
    }

    return universities.map((uni) => plainToInstance(UniversityDto, uni, { excludeExtraneousValues: true }));
  }

  @Get('search')
  async fuzzySearch(@Query('term') term: string) {
    if (!term || term.trim() === '') {
      throw new BadRequestException('Search term must be provided');
    }

    const results = await this.universityService.fuzzySearch(term);
    return results.map((uni) => plainToInstance(UniversityDto, uni, { excludeExtraneousValues: true }));
  }

  @Get(':country/:id')
  async getUniversity(@Param('country') country: string, @Param('id', ParseIntPipe) id: number) {
    if (!country || country.trim() === '') {
      throw new BadRequestException('Invalid country string.');
    }

    const university = await this.universityService.getUniversity(country, id);
    if (!university) {
      throw new NotFoundException(`University with ID ${id} in ${country} not found`);
    }

    return plainToInstance(UniversityDto, university, {
      excludeExtraneousValues: true,
    });
  }

  @Patch(':country/:id')
  @UseGuards(JwtAccessTokenGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @UseInterceptors(
    FileInterceptor('logo', {
      storage: diskStorage({
        destination: './uploads',
        filename: (req, file, cb) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
          const ext = extname(file.originalname);
          cb(null, `logo-${uniqueSuffix}${ext}`);
        },
      }),
      fileFilter: (req, file, callback) => {
        if (!file.mimetype.match(/\/(jpg|jpeg|png|gif)$/)) {
          return callback(new BadRequestException('Only image files are allowed (jpg, jpeg, png, gif)!'), false);
        }
        callback(null, true);
      },
      limits: { fileSize: 2 * 1024 * 1024 },
    })
  )
  async updateUniversity(
    @Param('country') country: string,
    @Param('id', ParseIntPipe) id: number,
    @UploadedFile() logoFile: Express.Multer.File,
    @Body() updateUniversityDto: UpdateUniversityDto,
    @CurrentUser() user: UserEntity
  ) {
    if (!country || country.trim() === '') {
      throw new BadRequestException('Invalid country string.');
    }

    if (logoFile) {
      const logoUrl = `${process.env.APP_URL || 'http://localhost:6002'}/uploads/${logoFile.filename}`;
      updateUniversityDto = { ...updateUniversityDto, logo: logoUrl };
    }

    const updated = await this.universityService.updateUniversity(country, id, updateUniversityDto);
    if (!updated) {
      throw new NotFoundException(`University with ID ${id} in ${country} not found`);
    }

    return plainToInstance(UniversityDto, updated, {
      excludeExtraneousValues: true,
    });
  }

  @Delete(':country/:id')
  @UseGuards(JwtAccessTokenGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async deleteUniversity(
    @Param('country') country: string,
    @Param('id', ParseIntPipe) id: number,
    @Body('confirm_deletion') confirmDeletion: boolean,
    @CurrentUser() user: UserEntity
  ) {
    if (!confirmDeletion) {
      throw new BadRequestException('Deletion must be confirmed by setting confirm_deletion to true.');
    }

    if (!country || country.trim() === '') {
      throw new BadRequestException('Invalid country string.');
    }

    const result = await this.universityService.deleteUniversity(country, id);

    if (!result.success) {
      throw new BadRequestException(result.message);
    }

    return {
      message: result.message,
      deleted: true,
    };
  }

  @Get('export')
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async exportUniversities(@Query() query: ExportUniversityDto, @Res() res: Response) {
    try {
      const { format, ...filters } = query;
      const { data, filename, contentType } = await this.universityService.exportUniversities(filters, format);

      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

      const readableStream = new Readable();
      readableStream.push(data);
      readableStream.push(null);

      readableStream.pipe(res);
    } catch (error) {
      this.logger.error(`Export failed: ${error.message}`, error.stack);
      throw new BadRequestException('Export failed. Please try again later.');
    }
  }
}

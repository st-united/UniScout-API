import {
  Controller,
  Get,
  Query,
  ValidationPipe,
  NotFoundException,
  Param,
  ParseIntPipe,
  UsePipes,
  Req,
  Logger,
} from '@nestjs/common';
import { plainToInstance } from 'class-transformer';

import { UniversityService } from './university.service';
import { GetUniversityDto, UniversityTypeEnum } from './dto/get-university.dto';
import { GetSubjectsDto } from './dto/get-subject-dto';
import { UniversityDto } from './dto/university.dto';
import { ApiOperation } from '@nestjs/swagger';

@Controller('universities')
export class UserController {
  private readonly _logger = new Logger(UserController.name);

  constructor(private readonly _universityService: UniversityService) {}

  @Get()
  @ApiOperation({ summary: 'View universities (user)' })
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
    this._logger.log('Query.fieldNames:', query.fieldNames);

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

  @Get('countries')
  @ApiOperation({ summary: 'Get list of countries' })
  async getCountries() {
    const countries = await this._universityService.getAllAvailableCountries();
    return {
      message: 'Countries retrieved successfully.',
      data: countries,
    };
  }

  @Get('types')
  @ApiOperation({ summary: 'Get list of university types' })
  getUniversityTypes() {
    return {
      message: 'University types retrieved successfully.',
      data: Object.values(UniversityTypeEnum),
    };
  }

  @Get('academic-fields')
  @ApiOperation({ summary: 'Get list of academic fields' })
  async getAcademicFields() {
    const fields = await this._universityService.getAllAvailableAcademicFields();
    return {
      message: 'Academic fields retrieved successfully.',
      data: fields,
    };
  }

  @Get('subjects')
  @ApiOperation({ summary: 'Get all subjects' })
  @UsePipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    })
  )
  async getSubjects(@Query() query: GetSubjectsDto) {
    const subjects = await this._universityService.getAllSubjects(query);

    if (!subjects || subjects.length === 0) {
      return {
        message: 'No subjects found matching the criteria.',
        data: [],
        totalCount: 0,
      };
    }

    return {
      message: 'Subjects retrieved successfully.',
      data: subjects,
      totalCount: subjects.length,
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get university by ID (User)' })
  async getUniversity(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    const university = await this._universityService.getUniversity(id, req.ip);
    if (!university) {
      throw new NotFoundException(`University with ID ${id} not found.`);
    }
    return plainToInstance(UniversityDto, university, {
      excludeExtraneousValues: true,
    });
  }
}

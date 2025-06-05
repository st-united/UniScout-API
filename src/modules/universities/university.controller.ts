import {
  Controller,
  Get,
  Query,
  ValidationPipe,
  UsePipes,
  NotFoundException,
  Param,
  ParseIntPipe,
} from '@nestjs/common';
import { plainToInstance } from 'class-transformer';

import { UniversityService } from './university.service';
import { GetUniversityDto } from './dto/get-university.dto';
import { UniversityDto } from './dto/university.dto';

@Controller('universities')
export class UniversityController {
  constructor(private readonly _universityService: UniversityService) {}

  @Get()
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async findAll(@Query() query: GetUniversityDto) {
    const universities = await this._universityService.findAll(query);

    if (!universities.length) {
      return {
        message: 'No universities match the selected criteria.',
        data: [],
      };
    }
    return {
      message: 'Universities retrieved successfully.',
      data: universities,
    };
  }

  @Get(':id')
  async getUniversity(@Param('id', ParseIntPipe) id: number) {
    const university = await this._universityService.getUniversity(id);
    if (!university) {
      throw new NotFoundException(`University with ID ${id} not found`);
    }
    return plainToInstance(UniversityDto, university, {
      excludeExtraneousValues: true,
    });
  }
}

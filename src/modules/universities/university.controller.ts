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
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { plainToInstance } from 'class-transformer';

import { JwtAccessTokenGuard } from '../auth/guards/jwt-access-token.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/constants/enums';
import { CurrentUser } from 'src/modules/auth/decorators/current-user.decorator';
import { UserEntity } from '@UsersModule/entities';

import { UniversityService } from './university.service';
import { CreateUniversityDto } from './dto/create-university.dto';
import { UpdateUniversityDto } from './dto/update-university.dto';
import { GetUniversityDto, CountryEnum } from './dto/get-university.dto';
import { UniversityDto } from './dto/university.dto';

@Controller('universities')
export class UniversityController {
  private readonly logger = new Logger(UniversityController.name);

  constructor(private readonly universityService: UniversityService) {}

  @Post()
  @UseGuards(JwtAccessTokenGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @UseInterceptors(
    FileInterceptor('logo', {
      fileFilter: (req, file, callback) => {
        if (!file.mimetype.match(/\/(jpg|jpeg|png|gif)$/)) {
          return callback(new BadRequestException('Only image files are allowed (jpg, jpeg, png, gif)!'), false);
        }
        callback(null, true);
      },
      limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
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

    // You might want to replace this with real upload handling logic
    const logoUrl = `/uploads/${logoFile.filename}`;

    return this.universityService.create({ ...dto, logo: logoUrl });
  }

  @Get()
  async findAll(@Query() query: GetUniversityDto) {
    // Pass query parameters to service for filtering & pagination
    const universities = await this.universityService.findAll(query);

    return universities.map((uni) => plainToInstance(UniversityDto, uni, { excludeExtraneousValues: true }));
  }

  @Get(':country/:id')
  async getUniversityById(@Param('country') country: string, @Param('id', ParseIntPipe) id: number) {
    const countryEnum = this.getCountryEnum(country);
    if (!countryEnum) {
      throw new BadRequestException(
        `Invalid country: ${country}. Valid countries: ${Object.values(CountryEnum).join(', ')}`
      );
    }

    const university = await this.universityService.getUniversity(countryEnum, id);
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
  async updateUniversityById(
    @Param('country') country: string,
    @Param('id', ParseIntPipe) id: number,
    @Body() updateUniversityDto: UpdateUniversityDto,
    @CurrentUser() user: UserEntity
  ) {
    const countryEnum = this.getCountryEnum(country);
    if (!countryEnum) {
      throw new BadRequestException(
        `Invalid country: ${country}. Valid countries: ${Object.values(CountryEnum).join(', ')}`
      );
    }

    const updated = await this.universityService.updateUniversity(countryEnum, id, updateUniversityDto);
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
  async deleteUniversityById(
    @Param('country') country: string,
    @Param('id', ParseIntPipe) id: number,
    @Body('confirm_deletion') confirmDeletion: boolean,
    @CurrentUser() user: UserEntity
  ) {
    if (!confirmDeletion) {
      throw new BadRequestException('Deletion must be confirmed by setting confirm_deletion to true.');
    }

    const countryEnum = this.getCountryEnum(country);
    if (!countryEnum) {
      throw new BadRequestException(
        `Invalid country: ${country}. Valid countries: ${Object.values(CountryEnum).join(', ')}`
      );
    }

    const result = await this.universityService.deleteUniversity(countryEnum, id);

    if (!result.success) {
      throw new BadRequestException(result.message);
    }

    return {
      message: result.message,
      deleted: true,
    };
  }

  private getCountryEnum(country: string): CountryEnum | null {
    const upperCountry = country.toUpperCase();
    const countryKey = Object.keys(CountryEnum).find((key) => key.toUpperCase() === upperCountry);
    return countryKey ? CountryEnum[countryKey as keyof typeof CountryEnum] : null;
  }
}

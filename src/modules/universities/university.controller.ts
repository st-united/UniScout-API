import {
  Controller,
  Get,
  Post,
  Query,
  Delete,
  Patch,
  Param,
  Body,
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
  Logger,
  ParseIntPipe,
} from '@nestjs/common';

import { CreateUniversityDto } from './dto/create-university.dto';
import { UpdateUniversityDto } from './dto/update-university.dto';
import { DeleteUniversityDto, BulkDeleteUniversityDto } from './dto/delete-university.dto';
import { RestoreUniversityDto, BulkRestoreUniversityDto } from './dto/restore-university.dto';
import { CountryEnum } from './dto/get-university.dto';
import { UniversityService } from './university.service';

@Controller('universities')
export class UniversityController {
  private readonly logger = new Logger(UniversityController.name);

  constructor(private readonly universityService: UniversityService) {}

  @Get(':country/:id')
  async getUniversityById(@Param('country') country: string, @Param('id', ParseIntPipe) id: number) {
    try {
      this.logger.log(`Getting university with ID: ${id} in ${country}`);

      const countryEnum = this.getCountryEnum(country);
      if (!countryEnum) {
        throw new BadRequestException(
          `Invalid country: ${country}. Valid countries are: ${Object.values(CountryEnum).join(', ')}`
        );
      }

      const universityData = await this.universityService.getUniversity(countryEnum, id);

      if (!universityData) {
        throw new NotFoundException(`University with ID ${id} in ${country} not found`);
      }

      return universityData;
    } catch (error) {
      this.logger.error(`Error getting university: ${error.message}`, error.stack);

      if (error instanceof BadRequestException || error instanceof NotFoundException) {
        throw error;
      }

      throw new InternalServerErrorException(`Failed to get university: ${error.message}`);
    }
  }

  @Post()
  async createUniversity(@Body() createUniversityDto: CreateUniversityDto) {
    try {
      this.logger.log(`Creating university in ${createUniversityDto.country}`);

      const countryEnum = this.getCountryEnum(createUniversityDto.country);
      if (!countryEnum) {
        throw new BadRequestException(
          `Invalid country: ${createUniversityDto.country}. Valid countries are: ${Object.values(CountryEnum).join(
            ', '
          )}`
        );
      }

      createUniversityDto.country = countryEnum;

      return await this.universityService.createUniversity(createUniversityDto);
    } catch (error) {
      this.logger.error(`Error creating university: ${error.message}`, error.stack);

      if (error instanceof BadRequestException) {
        throw error;
      }

      throw new InternalServerErrorException(`Failed to create university: ${error.message}`);
    }
  }

  @Patch(':country/:id')
  async updateUniversityById(
    @Param('country') country: string,
    @Param('id', ParseIntPipe) id: number,
    @Body() updateUniversityDto: UpdateUniversityDto
  ) {
    try {
      this.logger.log(`Updating university with ID: ${id} in ${country}`);

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

      return updated;
    } catch (error) {
      this.logger.error(`Error updating university by ID: ${error.message}`, error.stack);

      if (error instanceof BadRequestException || error instanceof NotFoundException) {
        throw error;
      }

      throw new InternalServerErrorException(`Failed to update university by ID: ${error.message}`);
    }
  }

  @Delete(':country/:id')
  async deleteUniversityById(
    @Param('country') country: string,
    @Param('id', ParseIntPipe) id: number,
    @Body() deleteUniversityDto: DeleteUniversityDto
  ) {
    try {
      this.logger.log(`Deleting university with ID: ${id} in ${country}`);

      if (!deleteUniversityDto.confirm_deletion) {
        throw new BadRequestException('Deletion must be confirmed by setting confirm_deletion to true');
      }

      const countryEnum = this.getCountryEnum(country);
      if (!countryEnum) {
        throw new BadRequestException(
          `Invalid country: ${country}. Valid countries are: ${Object.values(CountryEnum).join(', ')}`
        );
      }

      const deleted = await this.universityService.deleteUniversity(countryEnum, id, deleteUniversityDto);

      if (!deleted) {
        throw new NotFoundException(`University with ID ${id} in ${country} not found`);
      }

      const deleteType = deleteUniversityDto.soft_delete ? 'soft deleted' : 'permanently deleted';
      return {
        message: `University with ID ${id} in ${country} has been successfully ${deleteType}`,
        deleted: true,
        soft_delete: deleteUniversityDto.soft_delete,
      };
    } catch (error) {
      this.logger.error(`Error deleting university: ${error.message}`, error.stack);

      if (error instanceof BadRequestException || error instanceof NotFoundException) {
        throw error;
      }

      throw new InternalServerErrorException(`Failed to delete university: ${error.message}`);
    }
  }

  @Delete(':country/bulk-delete')
  async bulkDeleteUniversities(@Param('country') country: string, @Body() bulkDeleteDto: BulkDeleteUniversityDto) {
    try {
      this.logger.log(`Bulk deleting ${bulkDeleteDto.ids.length} universities in ${country}`);

      if (!bulkDeleteDto.confirm_deletion) {
        throw new BadRequestException('Bulk deletion must be confirmed by setting confirm_deletion to true');
      }

      const countryEnum = this.getCountryEnum(country);
      if (!countryEnum) {
        throw new BadRequestException(
          `Invalid country: ${country}. Valid countries are: ${Object.values(CountryEnum).join(', ')}`
        );
      }

      const results = await this.universityService.bulkDeleteUniversities(countryEnum, bulkDeleteDto);

      const deleteType = bulkDeleteDto.soft_delete ? 'soft deleted' : 'permanently deleted';
      return {
        message: `Bulk delete completed for ${country} - ${results.successful.length} universities ${deleteType}`,
        results,
      };
    } catch (error) {
      this.logger.error(`Error bulk deleting universities: ${error.message}`, error.stack);

      if (error instanceof BadRequestException) {
        throw error;
      }

      throw new InternalServerErrorException(`Failed to bulk delete universities: ${error.message}`);
    }
  }

  @Patch(':country/:id/restore')
  async restoreUniversityById(
    @Param('country') country: string,
    @Param('id', ParseIntPipe) id: number,
    @Body() restoreUniversityDto: RestoreUniversityDto
  ) {
    try {
      this.logger.log(`Restoring university with ID: ${id} in ${country}`);

      if (!restoreUniversityDto.confirm_restoration) {
        throw new BadRequestException('Restoration must be confirmed by setting confirm_restoration to true');
      }

      const countryEnum = this.getCountryEnum(country);
      if (!countryEnum) {
        throw new BadRequestException(
          `Invalid country: ${country}. Valid countries are: ${Object.values(CountryEnum).join(', ')}`
        );
      }

      const restored = await this.universityService.restoreUniversity(countryEnum, id, restoreUniversityDto);

      if (!restored) {
        throw new NotFoundException(`University with ID ${id} in ${country} not found or not deleted`);
      }

      return {
        message: `University with ID ${id} in ${country} has been restored successfully`,
        restored: true,
      };
    } catch (error) {
      this.logger.error(`Error restoring university: ${error.message}`, error.stack);

      if (error instanceof BadRequestException || error instanceof NotFoundException) {
        throw error;
      }

      throw new InternalServerErrorException(`Failed to restore university: ${error.message}`);
    }
  }

  @Patch(':country/bulk-restore')
  async bulkRestoreUniversities(@Param('country') country: string, @Body() bulkRestoreDto: BulkRestoreUniversityDto) {
    try {
      this.logger.log(`Bulk restoring universities in ${country}`);

      if (!bulkRestoreDto.confirm_restoration) {
        throw new BadRequestException('Bulk restoration must be confirmed by setting confirm_restoration to true');
      }

      const countryEnum = this.getCountryEnum(country);
      if (!countryEnum) {
        throw new BadRequestException(
          `Invalid country: ${country}. Valid countries are: ${Object.values(CountryEnum).join(', ')}`
        );
      }

      const results = await this.universityService.bulkRestoreUniversities(countryEnum, bulkRestoreDto);

      return {
        message: `Bulk restore completed for ${country} - ${results.successful.length} universities restored`,
        results,
      };
    } catch (error) {
      this.logger.error(`Error bulk restoring universities: ${error.message}`, error.stack);

      if (error instanceof BadRequestException) {
        throw error;
      }

      throw new InternalServerErrorException(`Failed to bulk restore universities: ${error.message}`);
    }
  }

  private getCountryEnum(country: string): CountryEnum | null {
    if (!country) return null;

    const upperCountry = country.toUpperCase();

    switch (upperCountry) {
      case 'AUSTRALIA':
        return CountryEnum.AUSTRALIA;
      case 'INDIA':
        return CountryEnum.INDIA;
      case 'JAPAN':
        return CountryEnum.JAPAN;
      case 'KOREA':
        return CountryEnum.KOREA;
      case 'USA':
        return CountryEnum.USA;
      case 'VIETNAM':
        return CountryEnum.VIETNAM;
      default:
        return null;
    }
  }
}

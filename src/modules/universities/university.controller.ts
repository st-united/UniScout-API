import {
  Controller,
  Get,
  Post,
  Put,
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

import {
  CreateUniversityDto,
  CreateJapKoreaUniversityDto,
  CreateAustraliaUniversityDto,
} from './dto/create-university.dto';

import { UpdateUniversityDto } from './dto/update-university.dto';

import {
  DeleteUniversityDto,
  BulkDeleteUniversityDto,
  BulkDeleteUniversityByNameDto,
} from './dto/delete-university.dto';

import {
  RestoreUniversityDto,
  BulkRestoreUniversityDto,
  BulkRestoreUniversityByNameDto,
} from './dto/restore-university.dto';

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

      const universityData = await this.universityService.getUniversityByCountryAndId(countryEnum, id);

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

  @Get(':country/by-name/:university')
  async getUniversityByName(@Param('country') country: string, @Param('university') university: string) {
    try {
      this.logger.log(`Getting university: ${university} in ${country}`);

      const countryEnum = this.getCountryEnum(country);
      if (!countryEnum) {
        throw new BadRequestException(
          `Invalid country: ${country}. Valid countries are: ${Object.values(CountryEnum).join(', ')}`
        );
      }

      const decodedUniversity = this.decodeUniversityName(university);
      this.logger.log(`Decoded university: ${decodedUniversity}`);

      const universityData = await this.universityService.getUniversityByCountryAndName(countryEnum, decodedUniversity);

      if (!universityData) {
        throw new NotFoundException(`University '${decodedUniversity}' in ${country} not found`);
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

  @Post(':country')
  async createUniversity(@Param('country') country: string, @Body() createUniversityDto: any) {
    try {
      this.logger.log(`Creating university in ${country}`);

      const countryEnum = this.getCountryEnum(country);
      if (!countryEnum) {
        throw new BadRequestException(
          `Invalid country: ${country}. Valid countries are: ${Object.values(CountryEnum).join(', ')}`
        );
      }

      switch (countryEnum) {
        case CountryEnum.AUSTRALIA:
          return this.universityService.createUniversity(
            countryEnum,
            createUniversityDto as CreateAustraliaUniversityDto
          );

        case CountryEnum.JAPAN:
        case CountryEnum.KOREA:
          return this.universityService.createUniversity(
            countryEnum,
            createUniversityDto as CreateJapKoreaUniversityDto
          );

        default:
          return this.universityService.createUniversity(countryEnum, createUniversityDto as CreateUniversityDto);
      }
    } catch (error) {
      this.logger.error(`Error creating university: ${error.message}`, error.stack);

      if (error instanceof BadRequestException) {
        throw error;
      }

      throw new InternalServerErrorException(`Failed to create university: ${error.message}`);
    }
  }

  @Put(':country/:id')
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
          `Invalid country: ${country}. Valid countries are: ${Object.values(CountryEnum).join(', ')}`
        );
      }

      const updatedUniversity = await this.universityService.updateUniversity(countryEnum, id, updateUniversityDto);

      if (!updatedUniversity) {
        throw new NotFoundException(`University with ID ${id} in ${country} not found`);
      }

      return updatedUniversity;
    } catch (error) {
      this.logger.error(`Error updating university: ${error.message}`, error.stack);

      if (error instanceof BadRequestException || error instanceof NotFoundException) {
        throw error;
      }

      throw new InternalServerErrorException(`Failed to update university: ${error.message}`);
    }
  }

  @Put(':country/by-name/:university')
  async updateUniversityByName(
    @Param('country') country: string,
    @Param('university') university: string,
    @Body() updateUniversityDto: UpdateUniversityDto
  ) {
    try {
      this.logger.log(`Updating university: ${university} in ${country}`);

      const countryEnum = this.getCountryEnum(country);
      if (!countryEnum) {
        throw new BadRequestException(
          `Invalid country: ${country}. Valid countries are: ${Object.values(CountryEnum).join(', ')}`
        );
      }

      const decodedUniversity = this.decodeUniversityName(university);
      this.logger.log(`Decoded university: ${decodedUniversity}`);

      const updatedUniversity = await this.universityService.updateUniversityByName(
        countryEnum,
        decodedUniversity,
        updateUniversityDto
      );

      if (!updatedUniversity) {
        throw new NotFoundException(`University '${decodedUniversity}' in ${country} not found`);
      }

      return updatedUniversity;
    } catch (error) {
      this.logger.error(`Error updating university: ${error.message}`, error.stack);

      if (error instanceof BadRequestException || error instanceof NotFoundException) {
        throw error;
      }

      throw new InternalServerErrorException(`Failed to update university: ${error.message}`);
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

  @Delete(':country/by-name/:university')
  async deleteUniversityByName(
    @Param('country') country: string,
    @Param('university') university: string,
    @Body() deleteUniversityDto: DeleteUniversityDto
  ) {
    try {
      this.logger.log(`Deleting university: ${university} in ${country}`);

      if (!deleteUniversityDto.confirm_deletion) {
        throw new BadRequestException('Deletion must be confirmed by setting confirm_deletion to true');
      }

      const countryEnum = this.getCountryEnum(country);
      if (!countryEnum) {
        throw new BadRequestException(
          `Invalid country: ${country}. Valid countries are: ${Object.values(CountryEnum).join(', ')}`
        );
      }

      const decodedUniversity = this.decodeUniversityName(university);
      this.logger.log(`Decoded university: ${decodedUniversity}`);

      const deleted = await this.universityService.deleteUniversityByName(
        countryEnum,
        decodedUniversity,
        deleteUniversityDto
      );

      if (!deleted) {
        throw new NotFoundException(`University '${decodedUniversity}' in ${country} not found`);
      }

      const deleteType = deleteUniversityDto.soft_delete ? 'soft deleted' : 'permanently deleted';
      return {
        message: `University '${decodedUniversity}' in ${country} has been successfully ${deleteType}`,
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

  @Delete(':country/bulk-delete-by-name')
  async bulkDeleteUniversitiesByName(
    @Param('country') country: string,
    @Body() bulkDeleteByNameDto: BulkDeleteUniversityByNameDto
  ) {
    try {
      this.logger.log(`Bulk deleting ${bulkDeleteByNameDto.universities.length} universities by name in ${country}`);

      if (!bulkDeleteByNameDto.confirm_deletion) {
        throw new BadRequestException('Bulk deletion must be confirmed by setting confirm_deletion to true');
      }

      const countryEnum = this.getCountryEnum(country);
      if (!countryEnum) {
        throw new BadRequestException(
          `Invalid country: ${country}. Valid countries are: ${Object.values(CountryEnum).join(', ')}`
        );
      }

      const results = await this.universityService.bulkDeleteUniversitiesByName(countryEnum, bulkDeleteByNameDto);

      const deleteType = bulkDeleteByNameDto.soft_delete ? 'soft deleted' : 'permanently deleted';
      return {
        message: `Bulk delete by name completed for ${country} - ${results.successful.length} universities ${deleteType}`,
        results,
      };
    } catch (error) {
      this.logger.error(`Error bulk deleting universities by name: ${error.message}`, error.stack);

      if (error instanceof BadRequestException) {
        throw error;
      }

      throw new InternalServerErrorException(`Failed to bulk delete universities by name: ${error.message}`);
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

      const countryEnum = this.getCountryEnum(country);
      if (!countryEnum) {
        throw new BadRequestException(
          `Invalid country: ${country}. Valid countries are: ${Object.values(CountryEnum).join(', ')}`
        );
      }

      const restoredUniversity = await this.universityService.restoreUniversity(countryEnum, id, restoreUniversityDto);

      if (!restoredUniversity) {
        throw new NotFoundException(`University with ID ${id} in ${country} not found or already active`);
      }

      return {
        message: `University with ID ${id} in ${country} has been successfully restored`,
        university: restoredUniversity,
      };
    } catch (error) {
      this.logger.error(`Error restoring university: ${error.message}`, error.stack);

      if (error instanceof BadRequestException || error instanceof NotFoundException) {
        throw error;
      }

      throw new InternalServerErrorException(`Failed to restore university: ${error.message}`);
    }
  }

  @Patch(':country/by-name/:university/restore')
  async restoreUniversityByName(
    @Param('country') country: string,
    @Param('university') university: string,
    @Body() restoreUniversityDto: RestoreUniversityDto
  ) {
    try {
      this.logger.log(`Restoring university: ${university} in ${country}`);

      const countryEnum = this.getCountryEnum(country);
      if (!countryEnum) {
        throw new BadRequestException(
          `Invalid country: ${country}. Valid countries are: ${Object.values(CountryEnum).join(', ')}`
        );
      }

      const decodedUniversity = this.decodeUniversityName(university);
      this.logger.log(`Decoded university: ${decodedUniversity}`);

      const restoredUniversity = await this.universityService.restoreUniversityByName(
        countryEnum,
        decodedUniversity,
        restoreUniversityDto
      );

      if (!restoredUniversity) {
        throw new NotFoundException(`University '${decodedUniversity}' in ${country} not found or already active`);
      }

      return {
        message: `University '${decodedUniversity}' in ${country} has been successfully restored`,
        university: restoredUniversity,
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
      this.logger.log(`Bulk restoring ${bulkRestoreDto.ids.length} universities in ${country}`);

      const countryEnum = this.getCountryEnum(country);
      if (!countryEnum) {
        throw new BadRequestException(
          `Invalid country: ${country}. Valid countries are: ${Object.values(CountryEnum).join(', ')}`
        );
      }

      const results = await this.universityService.bulkRestoreUniversities(countryEnum, bulkRestoreDto);

      return {
        message: `Bulk restore completed for ${country}`,
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

  @Patch(':country/bulk-restore-by-name')
  async bulkRestoreUniversitiesByName(
    @Param('country') country: string,
    @Body() bulkRestoreByNameDto: BulkRestoreUniversityByNameDto
  ) {
    try {
      this.logger.log(`Bulk restoring ${bulkRestoreByNameDto.universities.length} universities by name in ${country}`);

      const countryEnum = this.getCountryEnum(country);
      if (!countryEnum) {
        throw new BadRequestException(
          `Invalid country: ${country}. Valid countries are: ${Object.values(CountryEnum).join(', ')}`
        );
      }

      const results = await this.universityService.bulkRestoreUniversitiesByName(countryEnum, bulkRestoreByNameDto);

      return {
        message: `Bulk restore by name completed for ${country}`,
        results,
      };
    } catch (error) {
      this.logger.error(`Error bulk restoring universities by name: ${error.message}`, error.stack);

      if (error instanceof BadRequestException) {
        throw error;
      }

      throw new InternalServerErrorException(`Failed to bulk restore universities by name: ${error.message}`);
    }
  }

  private getCountryEnum(country: string): CountryEnum | null {
    const normalizedCountry = country.charAt(0).toUpperCase() + country.slice(1).toLowerCase();

    switch (normalizedCountry) {
      case 'Australia':
        return CountryEnum.AUSTRALIA;
      case 'India':
        return CountryEnum.INDIA;
      case 'Japan':
        return CountryEnum.JAPAN;
      case 'Korea':
        return CountryEnum.KOREA;
      case 'Usa':
        return CountryEnum.USA;
      case 'Vietnam':
        return CountryEnum.VIETNAM;
      default:
        return null;
    }
  }

  private decodeUniversityName(urlName: string): string {
    try {
      const withSpaces = urlName.replace(/_/g, ' ');
      return decodeURIComponent(withSpaces);
    } catch (error) {
      this.logger.warn(`Failed to decode university name: ${urlName}, using as-is`);
      return urlName.replace(/_/g, ' ');
    }
  }
}

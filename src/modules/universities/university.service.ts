import { Injectable, NotFoundException, Logger, InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { AusUniEntity } from './entities/aus.entity';
import { IndUniEntity } from './entities/ind.entity';
import { JapUniEntity } from './entities/jap.entity';
import { KorUniEntity } from './entities/kor.entity';
import { UsaUniEntity } from './entities/usa.entity';
import { VnUniEntity } from './entities/vn.entity';

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

@Injectable()
export class UniversityService {
  private readonly logger = new Logger(UniversityService.name);

  constructor(
    @InjectRepository(AusUniEntity) private ausUniRepository: Repository<AusUniEntity>,
    @InjectRepository(IndUniEntity) private indUniRepository: Repository<IndUniEntity>,
    @InjectRepository(JapUniEntity) private japUniRepository: Repository<JapUniEntity>,
    @InjectRepository(KorUniEntity) private korUniRepository: Repository<KorUniEntity>,
    @InjectRepository(UsaUniEntity) private usaUniRepository: Repository<UsaUniEntity>,
    @InjectRepository(VnUniEntity) private vnUniRepository: Repository<VnUniEntity>
  ) {}

  async createUniversity(
    country: CountryEnum,
    createUniversityDto: CreateUniversityDto | CreateAustraliaUniversityDto | CreateJapKoreaUniversityDto
  ) {
    const normalizedCountry = this.normalizeCountryName(country);

    switch (normalizedCountry) {
      case 'australia': {
        const ausUni = this.ausUniRepository.create(createUniversityDto as CreateAustraliaUniversityDto);
        return this.ausUniRepository.save(ausUni);
      }

      case 'india': {
        const indUni = this.indUniRepository.create(createUniversityDto as CreateUniversityDto);
        return this.indUniRepository.save(indUni);
      }

      case 'japan': {
        const japUni = this.japUniRepository.create(createUniversityDto as CreateJapKoreaUniversityDto);
        return this.japUniRepository.save(japUni);
      }

      case 'korea': {
        const korUni = this.korUniRepository.create(createUniversityDto as CreateJapKoreaUniversityDto);
        return this.korUniRepository.save(korUni);
      }

      case 'usa': {
        const usaUni = this.usaUniRepository.create(createUniversityDto as CreateUniversityDto);
        return this.usaUniRepository.save(usaUni);
      }

      case 'vietnam': {
        const vnUni = this.vnUniRepository.create(createUniversityDto as CreateUniversityDto);
        return this.vnUniRepository.save(vnUni);
      }

      default:
        throw new NotFoundException(`Country '${country}' not supported`);
    }
  }

  async getUniversityByCountryAndId(country: CountryEnum, id: number) {
    try {
      this.logger.log(`Looking for university with ID: ${id} in ${country}`);

      const normalizedCountry = this.normalizeCountryName(country);

      switch (normalizedCountry) {
        case 'australia':
          return await this.ausUniRepository.findOne({
            where: { id },
          });

        case 'india':
          return await this.indUniRepository.findOne({
            where: { id },
          });

        case 'japan':
          return await this.japUniRepository.findOne({
            where: { id },
          });

        case 'korea':
          return await this.korUniRepository.findOne({
            where: { id },
          });

        case 'usa':
          return await this.usaUniRepository.findOne({
            where: { id },
          });

        case 'vietnam':
          return await this.vnUniRepository.findOne({
            where: { id },
          });

        default:
          throw new NotFoundException(`Country '${country}' not supported`);
      }
    } catch (error) {
      this.logger.error(`Database error finding university with ID ${id} in ${country}: ${error.message}`, error.stack);

      if (error instanceof NotFoundException) {
        throw error;
      }

      throw new InternalServerErrorException(`Database error: ${error.message}`);
    }
  }

  async getUniversityByCountryAndName(country: CountryEnum, university: string) {
    try {
      this.logger.log(`Looking for university: ${university} in ${country}`);

      const normalizedCountry = this.normalizeCountryName(country);

      switch (normalizedCountry) {
        case 'australia':
          return await this.ausUniRepository.findOne({
            where: { university: university },
          });

        case 'india':
          return await this.indUniRepository.findOne({
            where: { university: university },
          });

        case 'japan':
          return await this.japUniRepository.findOne({
            where: { university: university },
          });

        case 'korea':
          return await this.korUniRepository.findOne({
            where: { university: university },
          });

        case 'usa':
          return await this.usaUniRepository.findOne({
            where: { university: university },
          });

        case 'vietnam':
          return await this.vnUniRepository.findOne({
            where: { university: university },
          });

        default:
          throw new NotFoundException(`Country '${country}' not supported`);
      }
    } catch (error) {
      this.logger.error(`Database error finding university ${university} in ${country}: ${error.message}`, error.stack);

      if (error instanceof NotFoundException) {
        throw error;
      }

      throw new InternalServerErrorException(`Database error: ${error.message}`);
    }
  }

  async updateUniversity(country: CountryEnum, id: number, updateUniversityDto: UpdateUniversityDto) {
    try {
      this.logger.log(`Updating university with ID: ${id} in ${country}`);

      const normalizedCountry = this.normalizeCountryName(country);

      const transformedDto = this.transformUpdateDto(updateUniversityDto);

      switch (normalizedCountry) {
        case 'australia': {
          const result = await this.ausUniRepository.update({ id }, transformedDto);
          if (result.affected === 0) return null;
          return this.ausUniRepository.findOne({ where: { id } });
        }

        case 'india': {
          const result = await this.indUniRepository.update({ id }, transformedDto);
          if (result.affected === 0) return null;
          return this.indUniRepository.findOne({ where: { id } });
        }

        case 'japan': {
          const result = await this.japUniRepository.update({ id }, transformedDto);
          if (result.affected === 0) return null;
          return this.japUniRepository.findOne({ where: { id } });
        }

        case 'korea': {
          const result = await this.korUniRepository.update({ id }, transformedDto);
          if (result.affected === 0) return null;
          return this.korUniRepository.findOne({ where: { id } });
        }

        case 'usa': {
          const result = await this.usaUniRepository.update({ id }, transformedDto);
          if (result.affected === 0) return null;
          return this.usaUniRepository.findOne({ where: { id } });
        }

        case 'vietnam': {
          const result = await this.vnUniRepository.update({ id }, transformedDto);
          if (result.affected === 0) return null;
          return this.vnUniRepository.findOne({ where: { id } });
        }

        default:
          throw new NotFoundException(`Country '${country}' not supported`);
      }
    } catch (error) {
      this.logger.error(
        `Database error updating university with ID ${id} in ${country}: ${error.message}`,
        error.stack
      );

      if (error instanceof NotFoundException) {
        throw error;
      }

      throw new InternalServerErrorException(`Database error: ${error.message}`);
    }
  }

  async updateUniversityByName(country: CountryEnum, university: string, updateUniversityDto: UpdateUniversityDto) {
    try {
      this.logger.log(`Updating university: ${university} in ${country}`);

      const normalizedCountry = this.normalizeCountryName(country);

      const transformedDto = this.transformUpdateDto(updateUniversityDto);

      switch (normalizedCountry) {
        case 'australia': {
          const result = await this.ausUniRepository.update({ university: university }, transformedDto);
          if (result.affected === 0) return null;
          return this.ausUniRepository.findOne({ where: { university: university } });
        }

        case 'india': {
          const result = await this.indUniRepository.update({ university: university }, transformedDto);
          if (result.affected === 0) return null;
          return this.indUniRepository.findOne({ where: { university: university } });
        }

        case 'japan': {
          const result = await this.japUniRepository.update({ university: university }, transformedDto);
          if (result.affected === 0) return null;
          return this.japUniRepository.findOne({ where: { university: university } });
        }

        case 'korea': {
          const result = await this.korUniRepository.update({ university: university }, transformedDto);
          if (result.affected === 0) return null;
          return this.korUniRepository.findOne({ where: { university: university } });
        }

        case 'usa': {
          const result = await this.usaUniRepository.update({ university: university }, transformedDto);
          if (result.affected === 0) return null;
          return this.usaUniRepository.findOne({ where: { university: university } });
        }

        case 'vietnam': {
          const result = await this.vnUniRepository.update({ university: university }, transformedDto);
          if (result.affected === 0) return null;
          return this.vnUniRepository.findOne({ where: { university: university } });
        }

        default:
          throw new NotFoundException(`Country '${country}' not supported`);
      }
    } catch (error) {
      this.logger.error(
        `Database error updating university ${university} in ${country}: ${error.message}`,
        error.stack
      );

      if (error instanceof NotFoundException) {
        throw error;
      }

      throw new InternalServerErrorException(`Database error: ${error.message}`);
    }
  }

  async deleteUniversity(country: CountryEnum, id: number, deleteDto: DeleteUniversityDto): Promise<boolean> {
    try {
      this.logger.log(`Deleting university with ID: ${id} in ${country} (soft: ${deleteDto.soft_delete})`);

      const repository = this.getRepositoryByCountry(this.normalizeCountryName(country));

      if (deleteDto.soft_delete) {
        // Soft delete - update deleted_at timestamp and add metadata
        const updateData: any = {
          deleted_at: new Date(),
          is_deleted: true,
        };

        if (deleteDto.reason) updateData.deletion_reason = deleteDto.reason;
        if (deleteDto.admin_notes) updateData.admin_notes = deleteDto.admin_notes;

        const result = await repository.update({ id }, updateData);
        return result.affected > 0;
      } else {
        // Hard delete - permanently remove from database
        const result = await repository.delete({ id });
        return result.affected > 0;
      }
    } catch (error) {
      this.logger.error(
        `Database error deleting university with ID ${id} in ${country}: ${error.message}`,
        error.stack
      );

      if (error instanceof NotFoundException) {
        throw error;
      }

      throw new InternalServerErrorException(`Database error: ${error.message}`);
    }
  }

  async deleteUniversityByName(
    country: CountryEnum,
    university: string,
    deleteDto: DeleteUniversityDto
  ): Promise<boolean> {
    try {
      this.logger.log(`Deleting university: ${university} in ${country} (soft: ${deleteDto.soft_delete})`);

      const repository = this.getRepositoryByCountry(this.normalizeCountryName(country));

      if (deleteDto.soft_delete) {
        // Soft delete - update deleted_at timestamp and add metadata
        const updateData: any = {
          deleted_at: new Date(),
          is_deleted: true,
        };

        if (deleteDto.reason) updateData.deletion_reason = deleteDto.reason;
        if (deleteDto.admin_notes) updateData.admin_notes = deleteDto.admin_notes;

        const result = await repository.update({ university: university }, updateData);
        return result.affected > 0;
      } else {
        // Hard delete - permanently remove from database
        const result = await repository.delete({ university: university });
        return result.affected > 0;
      }
    } catch (error) {
      this.logger.error(
        `Database error deleting university ${university} in ${country}: ${error.message}`,
        error.stack
      );

      if (error instanceof NotFoundException) {
        throw error;
      }

      throw new InternalServerErrorException(`Database error: ${error.message}`);
    }
  }

  async bulkDeleteUniversities(country: CountryEnum, bulkDeleteDto: BulkDeleteUniversityDto) {
    try {
      this.logger.log(`Bulk deleting ${bulkDeleteDto.ids.length} universities in ${country}`);

      const repository = this.getRepositoryByCountry(this.normalizeCountryName(country));
      const results = {
        successful: [],
        failed: [],
        total: bulkDeleteDto.ids.length,
      };

      for (const id of bulkDeleteDto.ids) {
        try {
          if (bulkDeleteDto.soft_delete) {
            // Soft delete
            const updateData: any = {
              deleted_at: new Date(),
              is_deleted: true,
            };

            if (bulkDeleteDto.reason) updateData.deletion_reason = bulkDeleteDto.reason;
            if (bulkDeleteDto.admin_notes) updateData.admin_notes = bulkDeleteDto.admin_notes;

            const result = await repository.update({ id }, updateData);

            if (result.affected > 0) {
              results.successful.push({ id, action: 'soft_deleted' });
            } else {
              results.failed.push({ id, error: 'University not found' });
            }
          } else {
            // Hard delete
            const result = await repository.delete({ id });

            if (result.affected > 0) {
              results.successful.push({ id, action: 'permanently_deleted' });
            } else {
              results.failed.push({ id, error: 'University not found' });
            }
          }
        } catch (error) {
          results.failed.push({ id, error: error.message });
        }
      }

      return results;
    } catch (error) {
      this.logger.error(`Database error bulk deleting universities in ${country}: ${error.message}`, error.stack);
      throw new InternalServerErrorException(`Database error: ${error.message}`);
    }
  }

  async bulkDeleteUniversitiesByName(country: CountryEnum, bulkDeleteByNameDto: BulkDeleteUniversityByNameDto) {
    try {
      this.logger.log(`Bulk deleting ${bulkDeleteByNameDto.universities.length} universities by name in ${country}`);

      const repository = this.getRepositoryByCountry(this.normalizeCountryName(country));
      const results = {
        successful: [],
        failed: [],
        total: bulkDeleteByNameDto.universities.length,
      };

      for (const universityName of bulkDeleteByNameDto.universities) {
        try {
          if (bulkDeleteByNameDto.soft_delete) {
            // Soft delete
            const updateData: any = {
              deleted_at: new Date(),
              is_deleted: true,
            };

            if (bulkDeleteByNameDto.reason) updateData.deletion_reason = bulkDeleteByNameDto.reason;
            if (bulkDeleteByNameDto.admin_notes) updateData.admin_notes = bulkDeleteByNameDto.admin_notes;

            const result = await repository.update({ university: universityName }, updateData);

            if (result.affected > 0) {
              results.successful.push({ university: universityName, action: 'soft_deleted' });
            } else {
              results.failed.push({ university: universityName, error: 'University not found' });
            }
          } else {
            // Hard delete
            const result = await repository.delete({ university: universityName });

            if (result.affected > 0) {
              results.successful.push({ university: universityName, action: 'permanently_deleted' });
            } else {
              results.failed.push({ university: universityName, error: 'University not found' });
            }
          }
        } catch (error) {
          results.failed.push({ university: universityName, error: error.message });
        }
      }

      return results;
    } catch (error) {
      this.logger.error(
        `Database error bulk deleting universities by name in ${country}: ${error.message}`,
        error.stack
      );
      throw new InternalServerErrorException(`Database error: ${error.message}`);
    }
  }

  async restoreUniversity(country: CountryEnum, id: number, restoreDto: RestoreUniversityDto) {
    try {
      this.logger.log(`Restoring university with ID: ${id} in ${country}`);

      const repository = this.getRepositoryByCountry(this.normalizeCountryName(country));

      const updateData: any = {
        deleted_at: null,
        is_deleted: false,
        restored_at: new Date(),
      };

      if (restoreDto.restore_reason) updateData.restore_reason = restoreDto.restore_reason;
      if (restoreDto.admin_notes) updateData.admin_notes = restoreDto.admin_notes;

      const result = await repository.update(
        { id, is_deleted: true }, // Only restore if it's currently deleted
        updateData
      );

      if (result.affected === 0) return null;

      return repository.findOne({ where: { id } });
    } catch (error) {
      this.logger.error(
        `Database error restoring university with ID ${id} in ${country}: ${error.message}`,
        error.stack
      );

      if (error instanceof NotFoundException) {
        throw error;
      }

      throw new InternalServerErrorException(`Database error: ${error.message}`);
    }
  }

  async restoreUniversityByName(country: CountryEnum, university: string, restoreDto: RestoreUniversityDto) {
    try {
      this.logger.log(`Restoring university: ${university} in ${country}`);

      const repository = this.getRepositoryByCountry(this.normalizeCountryName(country));

      const updateData: any = {
        deleted_at: null,
        is_deleted: false,
        restored_at: new Date(),
      };

      if (restoreDto.restore_reason) updateData.restore_reason = restoreDto.restore_reason;
      if (restoreDto.admin_notes) updateData.admin_notes = restoreDto.admin_notes;

      const result = await repository.update(
        { university: university, is_deleted: true }, // Only restore if it's currently deleted
        updateData
      );

      if (result.affected === 0) return null;

      return repository.findOne({ where: { university: university } });
    } catch (error) {
      this.logger.error(
        `Database error restoring university ${university} in ${country}: ${error.message}`,
        error.stack
      );

      if (error instanceof NotFoundException) {
        throw error;
      }

      throw new InternalServerErrorException(`Database error: ${error.message}`);
    }
  }

  async bulkRestoreUniversities(country: CountryEnum, bulkRestoreDto: BulkRestoreUniversityDto) {
    try {
      this.logger.log(`Bulk restoring ${bulkRestoreDto.ids.length} universities in ${country}`);

      const repository = this.getRepositoryByCountry(this.normalizeCountryName(country));
      const results = {
        successful: [],
        failed: [],
        total: bulkRestoreDto.ids.length,
      };

      for (const id of bulkRestoreDto.ids) {
        try {
          const updateData: any = {
            deleted_at: null,
            is_deleted: false,
            restored_at: new Date(),
          };

          if (bulkRestoreDto.restore_reason) updateData.restore_reason = bulkRestoreDto.restore_reason;
          if (bulkRestoreDto.admin_notes) updateData.admin_notes = bulkRestoreDto.admin_notes;

          const result = await repository.update({ id, is_deleted: true }, updateData);

          if (result.affected > 0) {
            const restoredUniversity = await repository.findOne({ where: { id } });
            results.successful.push({ id, university: restoredUniversity });
          } else {
            results.failed.push({ id, error: 'University not found or not deleted' });
          }
        } catch (error) {
          results.failed.push({ id, error: error.message });
        }
      }

      return results;
    } catch (error) {
      this.logger.error(`Database error bulk restoring universities in ${country}: ${error.message}`, error.stack);
      throw new InternalServerErrorException(`Database error: ${error.message}`);
    }
  }

  async bulkRestoreUniversitiesByName(country: CountryEnum, bulkRestoreByNameDto: BulkRestoreUniversityByNameDto) {
    try {
      this.logger.log(`Bulk restoring ${bulkRestoreByNameDto.universities.length} universities by name in ${country}`);

      const repository = this.getRepositoryByCountry(this.normalizeCountryName(country));
      const results = {
        successful: [],
        failed: [],
        total: bulkRestoreByNameDto.universities.length,
      };

      for (const universityName of bulkRestoreByNameDto.universities) {
        try {
          const updateData: any = {
            deleted_at: null,
            is_deleted: false,
            restored_at: new Date(),
          };

          if (bulkRestoreByNameDto.restore_reason) updateData.restore_reason = bulkRestoreByNameDto.restore_reason;
          if (bulkRestoreByNameDto.admin_notes) updateData.admin_notes = bulkRestoreByNameDto.admin_notes;

          const result = await repository.update({ university: universityName, is_deleted: true }, updateData);

          if (result.affected > 0) {
            const restoredUniversity = await repository.findOne({ where: { university: universityName } });
            results.successful.push({ university: universityName, data: restoredUniversity });
          } else {
            results.failed.push({ university: universityName, error: 'University not found or not deleted' });
          }
        } catch (error) {
          results.failed.push({ university: universityName, error: error.message });
        }
      }

      return results;
    } catch (error) {
      this.logger.error(
        `Database error bulk restoring universities by name in ${country}: ${error.message}`,
        error.stack
      );
      throw new InternalServerErrorException(`Database error: ${error.message}`);
    }
  }

  private getRepositoryByCountry(country: string): Repository<any> {
    const normalizedCountry = this.normalizeCountryName(country as CountryEnum);

    switch (normalizedCountry) {
      case 'australia':
        return this.ausUniRepository;
      case 'india':
        return this.indUniRepository;
      case 'japan':
        return this.japUniRepository;
      case 'korea':
        return this.korUniRepository;
      case 'usa':
        return this.usaUniRepository;
      case 'vietnam':
        return this.vnUniRepository;
      default:
        throw new NotFoundException(`Country '${country}' not supported`);
    }
  }

  private transformUpdateDto(updateDto: any): any {
    const transformed = { ...updateDto };

    if (transformed.name !== undefined) {
      transformed.university = transformed.name;
      delete transformed.name;
    }

    return transformed;
  }

  private normalizeCountryName(country: CountryEnum): string {
    return country.toLowerCase();
  }
}

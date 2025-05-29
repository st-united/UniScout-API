import { Injectable, NotFoundException, Logger, InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { UniEntity } from './entities/uni.entity';

import { CreateUniversityDto } from './dto/create-university.dto';

import { UpdateUniversityDto } from './dto/update-university.dto';

import { DeleteUniversityDto, BulkDeleteUniversityDto } from './dto/delete-university.dto';

import { RestoreUniversityDto, BulkRestoreUniversityDto } from './dto/restore-university.dto';

import { CountryEnum } from './dto/get-university.dto';

@Injectable()
export class UniversityService {
  private readonly logger = new Logger(UniversityService.name);

  constructor(@InjectRepository(UniEntity) private uniRepository: Repository<UniEntity>) {}

  async createUniversity(createUniversityDto: CreateUniversityDto) {
    const uni = this.uniRepository.create(createUniversityDto);
    return this.uniRepository.save(uni);
  }

  async getUniversity(country: CountryEnum, id: number) {
    try {
      this.logger.log(`Looking for university with ID: ${id} in ${country}`);

      const universityById = await this.uniRepository.findOne({
        where: {
          id,
          country,
        },
      });

      if (universityById) return universityById;

      throw new NotFoundException(`University with ID ${id} not found in ${country}.`);
    } catch (error) {
      this.logger.error(`Database error while fetching university in ${country}: ${error.message}`, error.stack);

      if (error instanceof NotFoundException) {
        throw error;
      }

      throw new InternalServerErrorException(`Database error: ${error.message}`);
    }
  }

  async updateUniversity(country: CountryEnum, id: number, updateUniversityDto: UpdateUniversityDto) {
    try {
      this.logger.log(`Attempting to update university with ID: ${id} in ${country}`);

      const result = await this.uniRepository.update({ id, country }, updateUniversityDto);

      if (result.affected && result.affected > 0) {
        const foundUniversity = await this.uniRepository.findOne({ where: { id, country } });
        return foundUniversity;
      }

      return null;
    } catch (error) {
      this.logger.error(`Error updating university: ${error.message}`, error.stack);
      throw new InternalServerErrorException(`Database error: ${error.message}`);
    }
  }

  async deleteUniversity(country: CountryEnum, id: number, deleteDto: DeleteUniversityDto): Promise<boolean> {
    try {
      this.logger.log(`Deleting university with ID: ${id} in ${country} (soft: ${deleteDto.soft_delete})`);

      if (deleteDto.soft_delete) {
        const updateData: any = {
          deleted_at: new Date(),
          is_deleted: true,
        };

        if (deleteDto.reason) updateData.deletion_reason = deleteDto.reason;
        if (deleteDto.admin_notes) updateData.admin_notes = deleteDto.admin_notes;

        const result = await this.uniRepository.update({ id, country }, updateData);
        return result.affected > 0;
      } else {
        const result = await this.uniRepository.delete({ id, country });
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

  async bulkDeleteUniversities(country: CountryEnum, bulkDeleteDto: BulkDeleteUniversityDto) {
    try {
      this.logger.log(`Bulk deleting ${bulkDeleteDto.ids.length} universities in ${country}`);

      const results = {
        successful: [],
        failed: [],
        total: bulkDeleteDto.ids.length,
      };

      for (const id of bulkDeleteDto.ids) {
        try {
          if (bulkDeleteDto.soft_delete) {
            const updateData: any = {
              deleted_at: new Date(),
              is_deleted: true,
            };

            if (bulkDeleteDto.reason) updateData.deletion_reason = bulkDeleteDto.reason;
            if (bulkDeleteDto.admin_notes) updateData.admin_notes = bulkDeleteDto.admin_notes;

            const result = await this.uniRepository.update({ id, country }, updateData);

            if (result.affected > 0) {
              results.successful.push({ id, action: 'soft_deleted' });
            } else {
              results.failed.push({ id, error: 'University not found' });
            }
          } else {
            const result = await this.uniRepository.delete({ id, country });

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

  async restoreUniversity(country: CountryEnum, id: number, restoreDto: RestoreUniversityDto) {
    try {
      this.logger.log(`Restoring university with ID: ${id} in ${country}`);

      const updateData: any = {
        deleted_at: null,
        is_deleted: false,
        restored_at: new Date(),
      };

      if (restoreDto.restore_reason) updateData.restore_reason = restoreDto.restore_reason;
      if (restoreDto.admin_notes) updateData.admin_notes = restoreDto.admin_notes;

      const result = await this.uniRepository.update({ id, country, is_deleted: true }, updateData);

      if (result.affected === 0) return null;

      return this.uniRepository.findOne({ where: { id, country } });
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

  async bulkRestoreUniversities(country: CountryEnum, bulkRestoreDto: BulkRestoreUniversityDto) {
    try {
      this.logger.log(`Bulk restoring ${bulkRestoreDto.ids.length} universities in ${country}`);

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

          const result = await this.uniRepository.update({ id, country, is_deleted: true }, updateData);

          if (result.affected > 0) {
            results.successful.push({ id, action: 'restored' });
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
}

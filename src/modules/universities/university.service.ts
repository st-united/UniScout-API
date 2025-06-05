import {
  Injectable,
  Logger,
  InternalServerErrorException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { unlink } from 'fs/promises';
import { join, basename } from 'path';

import { UniEntity } from './entities/uni.entity';
import { GetUniversityDto, UniversitySizeEnum } from './dto/get-university.dto';
import { CreateUniversityDto } from './dto/create-university.dto';
import { UpdateUniversityDto } from './dto/update-university.dto';

@Injectable()
export class UniversityService {
  private readonly _logger = new Logger(UniversityService.name);
  private readonly _FUZZY_THRESHOLD: number = parseFloat(process.env.FUZZY_SEARCH_THRESHOLD || '0.3');

  constructor(
    @InjectRepository(UniEntity)
    private readonly _uniRepository: Repository<UniEntity>
  ) {}

  //View University
  async findAll(query?: GetUniversityDto): Promise<UniEntity[]> {
    try {
      const qb = this._uniRepository.createQueryBuilder('uni');

      if (query?.search) {
        qb.andWhere('similarity(uni.university, :search) > :threshold', {
          search: query.search,
          threshold: this._FUZZY_THRESHOLD,
        });
        qb.orderBy('similarity(uni.university, :search)', 'ASC');
        qb.addOrderBy('uni.id', 'ASC');
      } else {
        qb.orderBy('uni.id', 'ASC');
      }

      if (query?.minRank) {
        qb.andWhere('uni.rank >= :minRank', { minRank: query.minRank });
      }
      if (query?.maxRank) {
        qb.andWhere('uni.rank <= :maxRank', { maxRank: query.maxRank });
      }

      if (query?.rank) {
        qb.andWhere('uni.rank = :rank', { rank: query.rank });
      }

      if (query?.type) {
        qb.andWhere('uni.type = :type', { type: query.type });
      }

      if (query?.country) {
        qb.andWhere(
          new Array(query.country.length)
            .fill(0)
            .map((_, i) => `uni.country ILIKE :country_${i}`)
            .join(' OR '),
          query.country.reduce((acc, curr, i) => ({ ...acc, [`country_${i}`]: curr }), {})
        );
      }

      if (query?.location) {
        qb.andWhere('uni.location ILIKE :location', { location: `%${query.location}%` });
      }

      if (query?.size) {
        switch (query.size) {
          case UniversitySizeEnum.SMALL:
            qb.andWhere('uni.studentPopulation < :smallThreshold', { smallThreshold: 20000 });
            break;
          case UniversitySizeEnum.MEDIUM:
            qb.andWhere('uni.studentPopulation >= :smallThreshold AND uni.studentPopulation < :mediumThreshold', {
              smallThreshold: 20000,
              mediumThreshold: 40000,
            });
            break;
          case UniversitySizeEnum.LARGE:
            qb.andWhere('uni.studentPopulation >= :mediumThreshold AND uni.studentPopulation < :largeThreshold', {
              mediumThreshold: 40000,
              largeThreshold: 100000,
            });
            break;
          case UniversitySizeEnum.MEGA_LARGE:
            qb.andWhere('uni.studentPopulation >= :largeThreshold', { largeThreshold: 100000 });
            break;
          case UniversitySizeEnum.UNKNOWN:
            break;
        }
      }

      if (query?.fields) {
        Object.entries(query.fields).forEach(([key, value]) => {
          if (value === true) {
            qb.andWhere(`uni.${key} = true`);
          }
        });
      }

      const page = query?.page ?? 1;
      const limit = query?.limit ?? 12;
      qb.skip((page - 1) * limit).take(limit);

      return await qb.getMany();
    } catch (error) {
      this._logger.error(`Error fetching universities: ${error.message}`, error.stack);
      throw new InternalServerErrorException(`Failed to fetch universities: ${error.message}`);
    }
  }

  async getUniversity(id: number): Promise<UniEntity> {
    try {
      const university = await this._uniRepository.findOne({ where: { id } });

      if (!university) {
        throw new NotFoundException(`University with ID ${id} not found.`);
      }
      return university;
    } catch (error) {
      this._logger.error(`Error fetching university: ${error.message}`, error.stack);
      if (error instanceof NotFoundException) throw error;

      throw new InternalServerErrorException(`Database error: ${error.message}`);
    }
  }

  //Validator
  async getValidCountries(): Promise<string[]> {
    const countries = await this._uniRepository
      .createQueryBuilder('uni')
      .select('DISTINCT uni.country', 'country')
      .getRawMany();

    return countries.map((c) => c.country);
  }

  //Create University
  async create(createDto: CreateUniversityDto & { logo: string }): Promise<UniEntity> {
    try {
      const uni = this._uniRepository.create({
        ...createDto,
      });
      return await this._uniRepository.save(uni);
    } catch (error) {
      this._logger.error(`Failed to create university: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Failed to create university');
    }
  }

  //Update University
  async updateUniversity(id: number, dto: UpdateUniversityDto): Promise<{ message: string; data: UniEntity }> {
    try {
      const university = await this._uniRepository.findOne({ where: { id } });

      if (!university) {
        throw new NotFoundException(`University with ID ${id} not found.`);
      }

      const updateData: Partial<UniEntity> = {};

      for (const key in dto) {
        if (Object.prototype.hasOwnProperty.call(dto, key)) {
          if (key === 'country') {
            updateData.country = dto.country && dto.country.length > 0 ? dto.country[0] : null;
          } else {
            (updateData as any)[key] = (dto as any)[key];
          }
        }
      }

      const updateResult = await this._uniRepository.update({ id }, updateData);

      if (updateResult.affected === 0) {
        throw new BadRequestException('University found but no changes were applied.');
      }

      const updatedUniversity = await this._uniRepository.findOne({ where: { id } });

      return {
        message: 'University updated successfully',
        data: updatedUniversity,
      };
    } catch (error) {
      this._logger.error(`Error updating university: ${error.message}`, error.stack);
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException(`Failed to update university: ${error.message}`);
    }
  }

  //Delete University
  async deleteUniversity(id: number): Promise<{ success: boolean; message: string }> {
    this._logger.log(`Deletion attempt: University ID=${id}`);

    try {
      const university = await this._uniRepository.findOne({ where: { id } });
      if (!university) {
        this._logger.warn(`Deletion failed: University not found. ID=${id}`);
        return { success: false, message: 'University not found.' };
      }

      if (university.logo) {
        await this.deleteLogoFile(university.logo);
      }

      const result = await this._uniRepository.delete({ id });

      if (result.affected && result.affected > 0) {
        this._logger.log(`University deleted: ID=${id}`);
        return { success: true, message: 'Successfully deleted university.' };
      } else {
        this._logger.warn(`Deletion failed (unknown reason). ID=${id}`);
        return { success: false, message: 'Deletion failed.' };
      }
    } catch (error) {
      this._logger.error(`Delete error for University ID=${id}: ${error.message}`, error.stack);
      throw new InternalServerErrorException(`Database error: ${error.message}`);
    }
  }

  private async deleteLogoFile(logoFilename: string): Promise<void> {
    try {
      const filePath = join(process.cwd(), 'uploads', 'university', basename(logoFilename));
      await unlink(filePath);
    } catch (error) {
      this._logger.warn(`Failed to delete logo file ${logoFilename}: ${error.message}`);
    }
  }
}

import {
  Injectable,
  Logger,
  InternalServerErrorException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Brackets } from 'typeorm';
import { unlink } from 'fs/promises';
import { join, basename } from 'path';

import { UniEntity } from './entities/uni.entity';
import { GetUniversityDto, UniversitySizeEnum, SortOrderEnum, SortByEnum } from './dto/get-university.dto';
import { CreateUniversityDto } from './dto/create-university.dto';
import { UpdateUniversityDto } from './dto/update-university.dto';
import { GeoIpService, SearchLogService, TrackingService } from '@DashboardModule/services';

@Injectable()
export class UniversityService {
  private readonly _logger = new Logger(UniversityService.name);

  constructor(
    @InjectRepository(UniEntity)
    private readonly _uniRepository: Repository<UniEntity>,
    private readonly _trackingService: TrackingService,
    private readonly _geoIpService: GeoIpService,
    private readonly _searchLogService: SearchLogService
  ) {}

  //View University
  async findAll(
    query?: GetUniversityDto,
    ipAddress?: string
  ): Promise<{ universities: UniEntity[]; totalCount: number; currentPage: number; limit: number }> {
    try {
      const qb = this._uniRepository.createQueryBuilder('uni');

      if (query && query.search && query.search.trim() !== '') {
        const searchTerm = query.search.trim();
        const similarityThreshold = 0.1;

        qb.andWhere(
          new Brackets((qbInner) => {
            qbInner
              .where('similarity(uni.university, :searchTerm) > :similarityThreshold', {
                searchTerm,
                similarityThreshold,
              })
              .orWhere('uni.location ILIKE :searchPattern', { searchPattern: `%${searchTerm}%` })
              .orWhere('uni.strength ILIKE :searchPattern', { searchPattern: `%${searchTerm}%` });

            qbInner.orWhere(
              `EXISTS (
              SELECT 1
              FROM jsonb_array_elements_text(uni."academicFields") AS field
              WHERE field ILIKE :searchPattern
            )`,
              { searchPattern: `%${searchTerm}%` }
            );
          })
        );

        let country = 'Unknown';
        if (ipAddress) {
          country = await this._geoIpService.getCountryFromIp(ipAddress);
          this._logger.log(`Country resolved by GeoIpService for findAll: ${country}`);
        } else {
          this._logger.warn('No IP address provided to UniversityService.findAll. Country will be Unknown.');
        }
        this._logger.log(`Logging search with country: ${country}`);
        await this._searchLogService.logSearch(query.search, country);
      }

      if (query?.type) {
        qb.andWhere('uni.type = :type', { type: query.type });
      }

      if (query?.country && query.country.length > 0) {
        qb.andWhere('uni.country IN (:...countries)', { countries: query.country });
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
          case UniversitySizeEnum.EXTRA_LARGE:
            qb.andWhere('uni.studentPopulation >= :largeThreshold', { largeThreshold: 100000 });
            break;
        }
      }

      if (query?.fieldNames && query.fieldNames.length > 0) {
        query.fieldNames.forEach((fieldName, index) => {
          qb.andWhere(
            new Brackets((subQb) => {
              subQb.where(
                `EXISTS (
                  SELECT 1
                  FROM jsonb_array_elements_text(uni."academicFields") AS field
                  WHERE field ILIKE :fieldName${index}
                )`,
                { [`fieldName${index}`]: `%${fieldName}%` }
              );
            })
          );
        });
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

      if (query?.location && !query.search) {
        qb.andWhere('uni.location ILIKE :location', { location: `%${query.location}%` });
      }

      const requestedSortOrder =
        query?.sortOrder?.toUpperCase() === SortOrderEnum.DESC ? SortOrderEnum.DESC : SortOrderEnum.ASC;

      qb.addOrderBy('uni.rank', requestedSortOrder, 'NULLS LAST');

      qb.addOrderBy(
        `CASE uni.country
        WHEN 'Vietnam' THEN 1
        WHEN 'Korea' THEN 2
        WHEN 'Japan' THEN 3
        WHEN 'India' THEN 4
        WHEN 'Australia' THEN 5
        WHEN 'USA' THEN 6
        ELSE 7 END`,
        'ASC',
        'NULLS LAST'
      );

      qb.addOrderBy('uni.university', SortOrderEnum.ASC);

      const page = query?.page ?? 1;
      const limit = query?.limit ?? 16;

      const [universities, totalCount] = await qb
        .skip((page - 1) * limit)
        .take(limit)
        .getManyAndCount();

      return { universities, totalCount, currentPage: page, limit };
    } catch (error) {
      this._logger.error(`Error fetching universities: ${error.message}`, error.stack);
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException(`Failed to fetch universities: ${error.message}`);
    }
  }

  async getAllAvailableCountries(): Promise<string[]> {
    const countries = await this._uniRepository
      .createQueryBuilder('uni')
      .select('DISTINCT uni.country', 'country')
      .orderBy('uni.country', 'ASC')
      .getRawMany();

    return countries.map((c) => c.country);
  }

  async getAllAvailableAcademicFields(): Promise<string[]> {
    const result = await this._uniRepository
      .createQueryBuilder('uni')
      .select('DISTINCT jsonb_array_elements_text(uni.academicFields)', 'field')
      .orderBy('uni.academicFields', 'ASC')
      .getRawMany();
    return result.map((row) => row.field);
  }

  async getUniversity(id: number, ipAddress?: string): Promise<UniEntity | null> {
    try {
      const university = await this._uniRepository.findOne({ where: { id } });

      if (!university) {
        throw new NotFoundException(`University with ID ${id} not found.`);
      }

      let country = 'Unknown';
      if (ipAddress) {
        country = await this._geoIpService.getCountryFromIp(ipAddress);
        this._logger.log(`Country resolved by GeoIpService for getUniversity: ${country}`);
        await this._trackingService.incrementCountryTraffic(country);
      } else {
        this._logger.warn('No IP address provided to UniversityService.getUniversity. Country will be Unknown.');
      }

      this._logger.log(`Tracking view for university ID ${id} with country: ${country}`);

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
          } else if (key === 'academicFields' && Array.isArray(dto.academicFields)) {
            updateData.academicFields = dto.academicFields;
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

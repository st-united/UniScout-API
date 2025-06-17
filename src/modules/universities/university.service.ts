import {
  Injectable,
  Logger,
  InternalServerErrorException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Brackets, SelectQueryBuilder } from 'typeorm';
import { unlink } from 'fs/promises';
import { join, basename } from 'path';
import { stringify } from 'csv-stringify';
import * as ExcelJS from 'exceljs';

import { UniEntity } from './entities/uni.entity';
import { GetUniversityDto, UniversitySizeEnum, SortOrderEnum } from './dto/get-university.dto';
import { CreateUniversityDto } from './dto/create-university.dto';
import { UpdateUniversityDto } from './dto/update-university.dto';
import { GeoIpService, SearchLogService, TrackingService } from '@DashboardModule/services';
import { ExportUniversityDto, ExportFormat } from './dto/export-university.dto';

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

  private async _applyFilters(
    qb: SelectQueryBuilder<UniEntity>,
    query: GetUniversityDto | ExportUniversityDto
  ): Promise<boolean> {
    let isExactMatch = false;
    if (query?.search?.trim()) {
      const searchTerm = query.search.trim();

      const similarityThreshold = 0.4;
      const exactMatchQb = this._uniRepository.createQueryBuilder('uni_exact');

      exactMatchQb.andWhere(
        new Brackets((qbInner) => {
          qbInner
            .where('uni_exact.university ILIKE :exactSearchTerm', { exactSearchTerm: `%${searchTerm}%` })
            .orWhere('uni_exact.location ILIKE :exactSearchTerm', { exactSearchTerm: `%${searchTerm}%` });
        })
      );

      const exactCount = await exactMatchQb.getCount();

      if (exactCount > 0) {
        qb.andWhere(
          new Brackets((qbInner) => {
            qbInner
              .where('uni.university ILIKE :exactSearchTerm', { exactSearchTerm: `%${searchTerm}%` })
              .orWhere('uni.location ILIKE :exactSearchTerm', { exactSearchTerm: `%${searchTerm}%` });
          })
        );
        isExactMatch = true;
      } else {
        qb.andWhere(
          new Brackets((qbInner) => {
            qbInner
              .where('word_similarity(:searchTerm, uni.university) > :similarityThreshold', {
                searchTerm,
                similarityThreshold,
              })
              .orWhere('word_similarity(:searchTerm,uni.location) > :similarityThreshold', {
                searchTerm,
                similarityThreshold,
              });
          })
        );
      }
    }

    if (query?.type && query.type.length > 0) {
      qb.andWhere('uni.type IN (:...types)', { types: query.type });
    }

    if (query?.country && query.country.length > 0) {
      qb.andWhere('uni.country IN (:...countries)', { countries: query.country });
    }

    if (query?.size && query.size.length > 0) {
      qb.andWhere(
        new Brackets((qbInner) => {
          query.size.forEach((size, index) => {
            if (index > 0)
              qbInner.orWhere(
                new Brackets((subQb) => {
                  switch (size) {
                    case UniversitySizeEnum.SMALL:
                      subQb.where('uni.studentPopulation < :smallThreshold', { smallThreshold: 20000 });
                      break;
                    case UniversitySizeEnum.MEDIUM:
                      subQb.where(
                        'uni.studentPopulation >= :smallThreshold AND uni.studentPopulation < :mediumThreshold',
                        {
                          smallThreshold: 20000,
                          mediumThreshold: 40000,
                        }
                      );
                      break;
                    case UniversitySizeEnum.LARGE:
                      subQb.where(
                        'uni.studentPopulation >= :mediumThreshold AND uni.studentPopulation < :largeThreshold',
                        {
                          mediumThreshold: 40000,
                          largeThreshold: 100000,
                        }
                      );
                      break;
                    case UniversitySizeEnum.EXTRA_LARGE:
                      subQb.where('uni.studentPopulation >= :largeThreshold', { largeThreshold: 100000 });
                      break;
                  }
                })
              );
            else {
              switch (size) {
                case UniversitySizeEnum.SMALL:
                  qbInner.where('uni.studentPopulation < :smallThreshold', { smallThreshold: 20000 });
                  break;
                case UniversitySizeEnum.MEDIUM:
                  qbInner.where(
                    'uni.studentPopulation >= :smallThreshold AND uni.studentPopulation < :mediumThreshold',
                    {
                      smallThreshold: 20000,
                      mediumThreshold: 40000,
                    }
                  );
                  break;
                case UniversitySizeEnum.LARGE:
                  qbInner.where(
                    'uni.studentPopulation >= :mediumThreshold AND uni.studentPopulation < :largeThreshold',
                    {
                      mediumThreshold: 40000,
                      largeThreshold: 100000,
                    }
                  );
                  break;
                case UniversitySizeEnum.EXTRA_LARGE:
                  qbInner.where('uni.studentPopulation >= :largeThreshold', { largeThreshold: 100000 });
                  break;
              }
            }
          });
        })
      );
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
    return isExactMatch;
  }

  private _applySorting(
    qb: SelectQueryBuilder<UniEntity>,
    sortOrder?: SortOrderEnum,
    searchTerm?: string,
    isExactMatch?: boolean
  ) {
    const requestedSortOrder = sortOrder?.toUpperCase() === SortOrderEnum.DESC ? SortOrderEnum.DESC : SortOrderEnum.ASC;
    const nullsOrder = requestedSortOrder === SortOrderEnum.DESC ? 'NULLS FIRST' : 'NULLS LAST';

    if (searchTerm) {
      if (isExactMatch) {
        qb.addOrderBy('uni.rank', requestedSortOrder, nullsOrder);
      } else {
        qb.addOrderBy(`similarity(uni.university, :searchTerm)`, 'DESC', 'NULLS LAST');
        qb.addOrderBy(`similarity(uni.location, :searchTerm)`, 'DESC', 'NULLS LAST');
        qb.setParameter('searchTerm', searchTerm);

        qb.addOrderBy('uni.rank', requestedSortOrder, nullsOrder);
      }
    } else {
      qb.addOrderBy('uni.rank', requestedSortOrder, nullsOrder);
    }

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
  }

  //View University
  async findAll(
    query?: GetUniversityDto,
    ipAddress?: string
  ): Promise<{ universities: UniEntity[]; totalCount: number; currentPage: number; limit: number }> {
    try {
      const qb = this._uniRepository.createQueryBuilder('uni');

      const isExactMatch = await this._applyFilters(qb, query);
      this._applySorting(qb, query?.sortOrder, query?.search, isExactMatch);

      if (query && query.search && ipAddress) {
        let country = 'Unknown';
        country = await this._geoIpService.getCountryFromIp(ipAddress);
        this._logger.log(`Country resolved by GeoIpService for findAll: ${country}`);
        this._logger.log(`Logging search with country: ${country}`);
        await this._searchLogService.logSearch(query.search, country);
      } else if (query && query.search) {
        this._logger.warn('No IP address provided to UniversityService.findAll. Country will be Unknown.');
        await this._searchLogService.logSearch(query.search, 'Unknown');
      }

      const page = query?.page ?? 1;
      const limit = query?.limit ?? 18;

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
      .orderBy('field', 'ASC')
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

  async exportUniversities(
    query: Omit<ExportUniversityDto, 'format'>,
    format: ExportFormat
  ): Promise<{ data: Buffer; filename: string; contentType: string }> {
    try {
      const qb = this._uniRepository.createQueryBuilder('uni');

      this._applyFilters(qb, query);
      this._applySorting(qb, query?.sortOrder);

      const universities = await qb.getMany();

      let columnsToInclude: string[];

      if (query.columns && query.columns.length > 0) {
        columnsToInclude = query.columns;
      } else {
        if (universities.length > 0) {
          columnsToInclude = Object.keys(universities[0]);
        } else {
          columnsToInclude = [];
        }
      }

      if (format === ExportFormat.CSV) {
        return await this.exportCSV(universities, columnsToInclude);
      } else if (format === ExportFormat.EXCEL) {
        return await this.exportExcel(universities, columnsToInclude);
      } else {
        throw new BadRequestException('Unsupported export format');
      }
    } catch (error) {
      this._logger.error(`Export error: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Failed to export universities');
    }
  }

  private async exportCSV(universities: UniEntity[], columns: string[]) {
    return new Promise<{ data: Buffer; filename: string; contentType: string }>((resolve, reject) => {
      const stringifier = stringify({ header: true, columns });
      const chunks: Buffer[] = [];

      stringifier.on('readable', () => {
        let row;
        while ((row = stringifier.read()) !== null) {
          chunks.push(Buffer.from(row));
        }
      });

      stringifier.on('error', (err) => reject(err));
      stringifier.on('finish', () => {
        const data = Buffer.concat(chunks);
        resolve({
          data,
          filename: `universities_${Date.now()}.csv`,
          contentType: 'text/csv',
        });
      });

      universities.forEach((u) => {
        const row: Record<string, any> = {};
        columns.forEach((col) => {
          row[col] = (u as any)[col];
        });
        stringifier.write(row);
      });

      stringifier.end();
    });
  }

  private async exportExcel(universities: UniEntity[], columns: string[]) {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Universities');

    worksheet.columns = columns.map((col) => ({
      header: col.charAt(0).toUpperCase() + col.slice(1),
      key: col,
      width: 20,
    }));

    universities.forEach((u) => {
      const row: Record<string, any> = {};
      columns.forEach((col) => {
        row[col] = (u as any)[col];
      });
      worksheet.addRow(row);
    });

    const buffer = await workbook.xlsx.writeBuffer();
    return {
      data: Buffer.from(buffer),
      filename: `universities_${Date.now()}.xlsx`,
      contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    };
  }
}

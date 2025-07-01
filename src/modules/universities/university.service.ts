import {
  Injectable,
  Logger,
  InternalServerErrorException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Brackets, SelectQueryBuilder, In } from 'typeorm';
import { unlink } from 'fs/promises';
import { join, basename } from 'path';
import { stringify } from 'csv-stringify';
import * as ExcelJS from 'exceljs';
import { plainToInstance } from 'class-transformer';

import { UniEntity } from './entities/uni.entity';
import { SubjectEntity } from './entities/subject.entity';
import { AcademicFieldEntity } from './entities/academic-field.entity';
import { GetUniversityDto, UniversitySizeEnum, SortOrderEnum } from './dto/get-university.dto';
import { CreateUniversityDto } from './dto/create-university.dto';
import { UpdateUniversityDto } from './dto/update-university.dto';
import { GeoIpService, SearchLogService, TrackingService } from '@DashboardModule/services';
import { ExportUniversityDto, ExportFormat } from './dto/export-university.dto';
import { UniversityDto } from './dto/university.dto';

type UniversityPaginationResult = {
  universities: UniEntity[];
  totalCount: number;
  currentPage: number;
  limit: number;
};

const UniversitySizeThresholds = {
  [UniversitySizeEnum.SMALL]: { max: 20000 },
  [UniversitySizeEnum.MEDIUM]: { min: 20000, max: 40000 },
  [UniversitySizeEnum.LARGE]: { min: 40000, max: 100000 },
  [UniversitySizeEnum.EXTRA_LARGE]: { min: 100000 },
};

@Injectable()
export class UniversityService {
  private readonly _logger = new Logger(UniversityService.name);

  constructor(
    @InjectRepository(UniEntity)
    private readonly _uniRepository: Repository<UniEntity>,
    @InjectRepository(SubjectEntity)
    private readonly _subjectRepository: Repository<SubjectEntity>,
    @InjectRepository(AcademicFieldEntity)
    private readonly _academicFieldRepository: Repository<AcademicFieldEntity>,
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
          query.size.forEach((size) => {
            const thresholds = UniversitySizeThresholds[size];
            if (thresholds) {
              qbInner.orWhere(
                new Brackets((subQb) => {
                  if (thresholds.min !== undefined && thresholds.max !== undefined) {
                    subQb.where('uni.studentPopulation >= :min AND uni.studentPopulation < :max', {
                      min: thresholds.min,
                      max: thresholds.max,
                    });
                  } else if (thresholds.min !== undefined) {
                    subQb.where('uni.studentPopulation >= :min', { min: thresholds.min });
                  } else if (thresholds.max !== undefined) {
                    subQb.where('uni.studentPopulation < :max', { max: thresholds.max });
                  }
                })
              );
            }
          });
        })
      );
    }

    if (query?.fieldNames && query.fieldNames.length > 0) {
      qb.andWhere('LOWER(academicField.name) IN (:...fieldNames)', {
        fieldNames: query.fieldNames.map((name) => name.toLowerCase()),
      });
    }

    if ((query as any)?.subjectNames && (query as any).subjectNames.length > 0) {
      qb.andWhere('LOWER(subject.name) IN (:...subjectNames)', {
        subjectNames: (query as any).subjectNames.map((name: string) => name.toLowerCase()),
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
      qb.setParameter('searchTerm', searchTerm);

      if (isExactMatch) {
        qb.addOrderBy('uni.rank', requestedSortOrder, nullsOrder);
      } else {
        qb.addOrderBy(`similarity(uni.university, :searchTerm)`, 'DESC', 'NULLS LAST');
        qb.addOrderBy(`similarity(uni.location, :searchTerm)`, 'DESC', 'NULLS LAST');
      }
    } else {
      qb.addOrderBy('uni.rank', requestedSortOrder, nullsOrder);
    }

    qb.addSelect(
      `CASE "uni"."country"
            WHEN 'Vietnam' THEN 1
            WHEN 'Korea' THEN 2
            WHEN 'Japan' THEN 3
            WHEN 'India' THEN 4
            WHEN 'Australia' THEN 5
            WHEN 'USA' THEN 6
            ELSE 7 END`,
      'country_order'
    );

    qb.addOrderBy('country_order', 'ASC');
    qb.addOrderBy('uni.university', SortOrderEnum.ASC);
  }

  private async _getUniversityById(id: number, includeDeleted = false): Promise<UniEntity> {
    const whereClause: any = { id };
    if (!includeDeleted) {
      whereClause.isDeleted = false;
    }

    const university = await this._uniRepository.findOne({ where: whereClause });

    if (!university) {
      throw new NotFoundException(`University with ID ${id} not found.`);
    }
    return university;
  }

  private async _getUniversitiesPaginated(
    query?: GetUniversityDto,
    defaultLimit = 18
  ): Promise<UniversityPaginationResult> {
    const qb = this._uniRepository
      .createQueryBuilder('uni')
      .leftJoinAndSelect('uni.academicFields', 'academicField')
      .leftJoinAndSelect('uni.subjects', 'subject');

    const isExactMatch = await this._applyFilters(qb, query);
    this._applySorting(qb, query?.sortOrder, query?.search, isExactMatch);

    const page = query?.page ?? 1;
    const limit = query?.limit ?? defaultLimit;

    const [universities, totalCount] = await qb
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return { universities, totalCount, currentPage: page, limit };
  }

  private _handleServiceError(error: any, context: string, id?: number): never {
    const identifier = id ? ` ID ${id}` : '';
    this._logger.error(`Error in ${context}${identifier}: ${error.message}`, error.stack);
    if (error instanceof NotFoundException || error instanceof BadRequestException) {
      throw error;
    }
    throw new InternalServerErrorException(`Operation failed in ${context}${identifier}: ${error.message}`);
  }

  private async _logSearch(searchTerm: string, ipAddress?: string): Promise<void> {
    let country = 'Unknown';
    if (ipAddress) {
      country = await this._geoIpService.getCountryFromIp(ipAddress);
      this._logger.log(`Country resolved by GeoIpService for search: ${country}`);
    } else {
      this._logger.warn('No IP address provided to UniversityService.findAll. Country will be Unknown.');
    }
    await this._searchLogService.logSearch(searchTerm, country);
    this._logger.log(`Logging search with country: ${country}`);
  }

  async findAll(
    query?: GetUniversityDto,
    ipAddress?: string,
    isAdminContext = false
  ): Promise<UniversityPaginationResult> {
    try {
      const defaultLimit = isAdminContext ? 12 : 18;

      const { universities, totalCount, currentPage, limit } = await this._getUniversitiesPaginated(
        query,
        defaultLimit
      );

      if (query && query.search) {
        if (isAdminContext) {
          this._logger.log(`Admin search performed: "${query.search}"`);
        } else {
          await this._logSearch(query.search, ipAddress);
        }
      }

      return { universities, totalCount, currentPage, limit };
    } catch (error) {
      const errorPrefix = isAdminContext ? 'Error fetching universities for admin' : 'Error fetching universities';
      this._handleServiceError(error, errorPrefix);
    }
  }

  //View University
  async getUniversity(id: number, ipAddress?: string): Promise<UniEntity> {
    try {
      const university = await this._getUniversityById(id);

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
      this._handleServiceError(error, 'getUniversity', id);
    }
  }

  //View University (Admin)
  async getUniversityAdmin(id: number): Promise<UniEntity> {
    try {
      const university = await this._getUniversityById(id);
      this._logger.log(`Admin fetched university ID ${id}`);

      return university;
    } catch (error) {
      this._handleServiceError(error, 'getUniversityAdmin', id);
    }
  }

  async countAll(query?: GetUniversityDto | ExportUniversityDto): Promise<number> {
    try {
      const qb = this._uniRepository.createQueryBuilder('uni');
      qb.where('uni.isDeleted = :isDeleted', { isDeleted: false });

      if (query?.fieldNames && query.fieldNames.length > 0) {
        qb.leftJoin('uni.academicFields', 'academicField');
      }

      if ((query as any)?.subjectNames && (query as any).subjectNames.length > 0) {
        qb.leftJoin('uni.subjects', 'subject');
      }

      await this._applyFilters(qb, query);

      const totalCount = await qb.getCount();
      return totalCount;
    } catch (error) {
      this._handleServiceError(error, 'countAll');
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
    const result = await this._academicFieldRepository
      .createQueryBuilder('uni')
      .innerJoin('uni.academicFields', 'academicField')
      .select('DISTINCT academicField.name', 'field')
      .orderBy('field', 'ASC')
      .getRawMany();
    return result.map((row) => row.field);
  }

  async getSubjectsByField(fieldName: string): Promise<string[]> {
    const field = await this._academicFieldRepository.findOne({
      where: { name: fieldName.toLowerCase() },
      relations: ['subjects'],
    });

    if (!field) {
      throw new NotFoundException(`Academic field "${fieldName}" not found`);
    }

    return field.subjects.map((s) => s.name);
  }

  //Create University
  async create(createDto: CreateUniversityDto & { logo: string }): Promise<UniEntity> {
    try {
      const { academicFields, subjects, ...uniDetails } = createDto;

      let academicFieldEntities: AcademicFieldEntity[] = [];
      if (academicFields && academicFields.length > 0) {
        academicFieldEntities = await this._academicFieldRepository.find({
          where: { name: In(academicFields) },
        });

        if (academicFieldEntities.length !== academicFields.length) {
          const foundNames = new Set(academicFieldEntities.map((af) => af.name));
          const missingNames = academicFields.filter((name) => !foundNames.has(name));
          throw new NotFoundException(`Academic field(s) not found: ${missingNames.join(', ')}`);
        }
      }

      let subjectEntities: SubjectEntity[] = [];
      if (subjects && subjects.length > 0) {
        subjectEntities = await this._subjectRepository.find({
          where: { name: In(subjects) },
        });

        if (subjectEntities.length !== subjects.length) {
          const foundNames = new Set(subjectEntities.map((s) => s.name));
          const missingNames = subjects.filter((name) => !foundNames.has(name));
          throw new NotFoundException(`Subject(s) not found: ${missingNames.join(', ')}`);
        }
      }

      const uni = this._uniRepository.create({
        ...uniDetails,
        academicFields: academicFieldEntities,
        subjects: subjectEntities,
      });

      return await this._uniRepository.save(uni);
    } catch (error) {
      this._handleServiceError(error, 'createUniversity');
    }
  }

  private async _getUniversityByIdWithRelations(id: number): Promise<UniEntity> {
    const university = await this._uniRepository.findOne({
      where: { id },
      relations: ['academicFields', 'subjects'],
    });
    if (!university) {
      this._handleServiceError(
        new NotFoundException(`University with ID ${id} not found`),
        '_getUniversityByIdWithRelations',
        id
      );
    }
    return university;
  }

  //Update University
  async updateUniversity(id: number, dto: UpdateUniversityDto): Promise<{ message: string; data: UniEntity }> {
    try {
      const university = await this._getUniversityByIdWithRelations(id);

      Object.assign(university, dto);
      if (dto.country) {
        university.country = dto.country;
      }

      if (dto.otherAcademicFieldsDetail !== undefined) {
        university.otherAcademicFieldsDetail = dto.otherAcademicFieldsDetail;
      }

      if (dto.academicFields !== undefined) {
        if (dto.academicFields.length === 0) {
          university.academicFields = [];
        } else {
          const academicFieldEntities = await this._academicFieldRepository.find({
            where: { name: In(dto.academicFields) },
          });

          if (academicFieldEntities.length !== dto.academicFields.length) {
            const foundNames = new Set(academicFieldEntities.map((af) => af.name));
            const missingNames = dto.academicFields.filter((name) => !foundNames.has(name));
            this._handleServiceError(
              new NotFoundException(`Academic field(s) not found: ${missingNames.join(', ')}`),
              'updateUniversity',
              id
            );
          }

          university.academicFields = academicFieldEntities;
        }
      }

      if (dto.subjectNames !== undefined) {
        if (dto.subjectNames.length === 0) {
          university.subjects = [];
        } else {
          const subjectEntities = await this._subjectRepository.find({
            where: { name: In(dto.subjectNames) },
          });

          if (subjectEntities.length !== dto.subjectNames.length) {
            const foundNames = new Set(subjectEntities.map((s) => s.name));
            const missingNames = dto.subjectNames.filter((name) => !foundNames.has(name));
            this._handleServiceError(
              new NotFoundException(`Subject(s) not found: ${missingNames.join(', ')}`),
              'updateUniversity',
              id
            );
          }

          university.subjects = subjectEntities;
        }
      }

      const updatedUniversity = await this._uniRepository.save(university);

      return {
        message: 'University updated successfully',
        data: updatedUniversity,
      };
    } catch (error) {
      this._handleServiceError(error, 'updateUniversity', id);
    }
  }

  //Delete University
  async deleteUniversity(id: number): Promise<{ success: boolean; message: string }> {
    this._logger.log(`Deletion attempt: University ID=${id}`);

    try {
      const university = await this._getUniversityById(id, true);

      if (university.logo) {
        await this.deleteLogoFile(university.logo);
      }

      const result = await this._uniRepository.delete({ id });

      if (result.affected && result.affected > 0) {
        this._logger.log(`University deleted: ID=${id}`);
        return { success: true, message: 'Successfully deleted university.' };
      } else {
        throw new InternalServerErrorException('Deletion failed due to an unexpected issue.');
      }
    } catch (error) {
      this._handleServiceError(error, 'deleteUniversity', id);
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
      const qb = this._uniRepository
        .createQueryBuilder('uni')
        .leftJoinAndSelect('uni.academicFields', 'academicField')
        .leftJoinAndSelect('uni.subjects', 'subject');

      this._applyFilters(qb, query);
      this._applySorting(qb, query?.sortOrder);

      const uniEntities = await qb.getMany();

      console.log('Fetched UniEntities before DTO transformation:', JSON.stringify(uniEntities, null, 2));

      const universities = plainToInstance(UniversityDto, uniEntities);

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

  private async exportCSV(universities: UniversityDto[], columns: string[]) {
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

  private async exportExcel(universities: UniversityDto[], columns: string[]) {
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

  //Chatbot
  async findByIds(ids: number[]): Promise<UniEntity[]> {
    try {
      if (!ids || ids.length === 0) {
        return [];
      }
      const universities = await this._uniRepository.find({
        where: { id: In(ids), isDeleted: false },
      });
      return universities;
    } catch (error) {
      this._handleServiceError(error, 'findByIds');
    }
  }
}

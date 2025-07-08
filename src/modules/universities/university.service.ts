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
import { UniversityDto, UniversityDisplayDto } from './dto/university.dto';

type UniversityPaginationResult = {
  universities: UniversityDisplayDto[];
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
    qb.andWhere('uni.isDeleted = :isDeleted', { isDeleted: false });

    if (query?.search?.trim()) {
      const searchTerm = query.search.trim();

      const similarityThreshold = 0.4;
      const exactMatchQb = this._uniRepository.createQueryBuilder('uni_exact');

      exactMatchQb.andWhere(
        new Brackets((qbInner) => {
          qbInner
            .where('uni_exact.abbreviation ILIKE :exactSearchTerm', { exactSearchTerm: `%${searchTerm}%` })
            .orWhere('uni_exact.university ILIKE :exactSearchTerm', { exactSearchTerm: `%${searchTerm}%` })
            .orWhere('uni_exact.location ILIKE :exactSearchTerm', { exactSearchTerm: `%${searchTerm}%` });
        })
      );
      exactMatchQb.andWhere('uni_exact.isDeleted = :isDeleted', { isDeleted: false });

      const exactCount = await exactMatchQb.getCount();

      if (exactCount > 0) {
        qb.andWhere(
          new Brackets((qbInner) => {
            qbInner
              .where('uni.abbreviation ILIKE :exactSearchTerm', { exactSearchTerm: `%${searchTerm}%` })
              .orWhere('uni.university ILIKE :exactSearchTerm', { exactSearchTerm: `%${searchTerm}%` })
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
        qb.addSelect(`similarity(uni.abbreviation, :searchTerm)`, 'abbreviation_similarity');
        qb.addSelect(`similarity(uni.university, :searchTerm)`, 'university_similarity');
        qb.addSelect(`similarity(uni.location, :searchTerm)`, 'location_similarity');
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
        qb.addOrderBy('abbreviation_similarity', 'DESC', 'NULLS LAST');
        qb.addOrderBy('university_similarity', 'DESC', 'NULLS LAST');
        qb.addOrderBy('location_similarity', 'DESC', 'NULLS LAST');
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

    const university = await this._uniRepository.findOne({
      where: whereClause,
      relations: ['academicFields', 'subjects'],
    });

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

    const [uniEntities, totalCount] = await qb
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    const allAcademicFieldNames = await this.getAllAcademicFieldNamesDefined();
    const universities = await Promise.all(
      uniEntities.map(async (uniEntity) => this._transformUniEntityToDisplayDto(uniEntity, allAcademicFieldNames))
    );

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

  private async _transformUniEntityToDisplayDto(
    uniEntity: UniEntity,
    allAcademicFieldNames: string[]
  ): Promise<UniversityDisplayDto> {
    const uniDto = plainToInstance(UniversityDto, uniEntity);

    const { exchange: uniDtoExchange, size, ...restUniDto } = uniDto;

    const transformedUni: UniversityDisplayDto = { ...restUniDto, size };
    if (uniEntity.logo) {
      const backendBaseUrl = process.env.BACKEND_BASE_URL || `http://localhost:${process.env.PORT || 3000}`;
      transformedUni.logo = `${backendBaseUrl}/static/${uniEntity.logo}`;
    } else {
      transformedUni.logo = '-';
    }

    const universityAcademicFields = new Set(uniEntity.academicFields?.map((af) => af.name.toLowerCase()) || []);

    allAcademicFieldNames.forEach((fieldName) => {
      const fieldHeader = fieldName.toLowerCase().replace(/[^a-z0-9]/g, '_');
      transformedUni[fieldHeader] = universityAcademicFields.has(fieldName.toLowerCase()) ? 'Yes' : 'No';
    });

    transformedUni.academicFieldsCommaSeparated = uniEntity.academicFields?.map((af) => af.name).join(', ') || 'NA';

    transformedUni.subjectsList = uniEntity.subjects?.map((s) => s.name).join(', ') || 'NA';

    if (uniDtoExchange === true) {
      transformedUni.exchange = 'Yes';
    } else if (uniDtoExchange === false) {
      transformedUni.exchange = 'No';
    } else {
      transformedUni.exchange = '-';
    }

    for (const key in transformedUni) {
      if (key === 'exchange' || key === 'size' || key === 'academicFieldsCommaSeparated' || key === 'subjectsList') {
        continue;
      }

      if (transformedUni[key] === null || transformedUni[key] === undefined || transformedUni[key] === '') {
        transformedUni[key] = '-';
      }
    }

    return transformedUni;
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
  async getUniversity(id: number, ipAddress?: string): Promise<UniversityDisplayDto> {
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

      const allAcademicFieldNames = await this.getAllAcademicFieldNamesDefined();
      return this._transformUniEntityToDisplayDto(university, allAcademicFieldNames);
    } catch (error) {
      this._handleServiceError(error, 'getUniversity', id);
    }
  }

  //View University (Admin)
  async getUniversityAdmin(id: number): Promise<UniversityDisplayDto> {
    try {
      const university = await this._getUniversityById(id);
      this._logger.log(`Admin fetched university ID ${id}`);

      const allAcademicFieldNames = await this.getAllAcademicFieldNamesDefined();
      return this._transformUniEntityToDisplayDto(university, allAcademicFieldNames);
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
    try {
      const countries = await this._uniRepository
        .createQueryBuilder('uni')
        .select('DISTINCT uni.country', 'country')
        .orderBy('uni.country', 'ASC')
        .getRawMany();

      return countries.map((c) => c.country);
    } catch (error) {
      throw new InternalServerErrorException('Failed to fetch available countries from database.');
    }
  }

  async getAllAcademicFieldNamesDefined(): Promise<string[]> {
    const academicFields = await this._academicFieldRepository
      .createQueryBuilder('academicField')
      .select('academicField.name', 'name')
      .distinct(true)
      .orderBy('academicField.name', 'ASC')
      .getRawMany();

    return academicFields.map((field) => field.name);
  }

  async getAllAvailableAcademicFields(): Promise<string[]> {
    const result = await this._academicFieldRepository
      .createQueryBuilder('academicField')
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
  async create(dto: CreateUniversityDto): Promise<UniversityDto> {
    const uni = this._uniRepository.create({
      university: dto.university,
      abbreviation: dto.abbreviation,
      latitude: dto.latitude,
      longitude: dto.longitude,
      logo: dto.logo,
      rank: dto.rank,
      type: dto.type,
      country: dto.country,
      location: dto.location,
      studentPopulation: dto.studentPopulation,
      year: dto.year,
      contact: dto.contact,
      email: dto.email,
      website: dto.website,
      strength: dto.strength,
      description: dto.description,
      exchange: dto.exchange,
    });

    if (dto.academicFields && dto.academicFields.length > 0) {
      const academicFieldEntities = await this._academicFieldRepository.find({
        where: { name: In(dto.academicFields) },
      });

      if (academicFieldEntities.length !== dto.academicFields.length) {
        const foundNames = new Set(academicFieldEntities.map((af) => af.name));
        const missingNames = dto.academicFields.filter((name) => !foundNames.has(name));
        throw new NotFoundException(`Academic field(s) not found: ${missingNames.join(', ')}`);
      }
      uni.academicFields = academicFieldEntities;
    } else {
      uni.academicFields = [];
    }

    if (dto.subjects && dto.subjects.length > 0) {
      const subjectEntities = await this._subjectRepository.find({
        where: { name: In(dto.subjects) },
      });

      if (subjectEntities.length !== dto.subjects.length) {
        const foundNames = new Set(subjectEntities.map((s) => s.name));
        const missingNames = dto.subjects.filter((name) => !foundNames.has(name));
        throw new NotFoundException(`Subject(s) not found: ${missingNames.join(', ')}`);
      }
      uni.subjects = subjectEntities;
    } else {
      uni.subjects = [];
    }

    try {
      const savedUni = await this._uniRepository.save(uni);
      return plainToInstance(UniversityDto, savedUni);
    } catch (error) {
      if (error.code === '23505') {
        throw new BadRequestException('University with this name already exists.');
      }
      Logger.error(`Error creating university: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Failed to create university.');
    }
  }

  async updateUniversity(id: number, dto: UpdateUniversityDto): Promise<UniversityDto> {
    const university = await this._uniRepository.findOne({ where: { id } });

    if (!university) {
      throw new NotFoundException(`University with ID ${id} not found`);
    }

    const updateData: Partial<UpdateUniversityDto> = { ...dto };
    delete updateData.academicFields;
    delete updateData.subjectNames;

    Object.assign(university, updateData);
    if (dto.academicFields !== undefined) {
      if (dto.academicFields.length > 0) {
        const academicFieldEntities = await this._academicFieldRepository.find({
          where: { name: In(dto.academicFields) },
        });

        if (academicFieldEntities.length !== dto.academicFields.length) {
          const foundNames = new Set(academicFieldEntities.map((af) => af.name));
          const missingNames = dto.academicFields.filter((name) => !foundNames.has(name));
          throw new NotFoundException(`Academic field(s) not found: ${missingNames.join(', ')}`);
        }
        university.academicFields = academicFieldEntities;
      } else {
        university.academicFields = [];
      }
    }

    if (dto.subjectNames !== undefined) {
      if (dto.subjectNames.length > 0) {
        const subjectEntities = await this._subjectRepository.find({
          where: { name: In(dto.subjectNames) },
        });

        if (subjectEntities.length !== dto.subjectNames.length) {
          const foundNames = new Set(subjectEntities.map((s) => s.name));
          const missingNames = dto.subjectNames.filter((name) => !foundNames.has(name));
          throw new NotFoundException(`Subject(s) not found: ${missingNames.join(', ')}`);
        }
        university.subjects = subjectEntities;
      } else {
        university.subjects = [];
      }
    }

    try {
      const savedUniversity = await this._uniRepository.save(university);
      return plainToInstance(UniversityDto, savedUniversity);
    } catch (error) {
      if (error.code === '23505') {
        throw new BadRequestException('University with this name already exists.');
      }
      Logger.error(`Error updating university: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Failed to update university.');
    }
  }

  //Delete University
  async deleteUniversity(id: number): Promise<{ success: boolean; message: string }> {
    this._logger.log(`Soft deletion attempt: University ID=${id}`);

    try {
      const university = await this._getUniversityById(id, false);
      if (university.logo) {
        await this.deleteLogoFile(university.logo);
      }

      const result = await this._uniRepository.update(id, { isDeleted: true });

      if (result.affected && result.affected > 0) {
        this._logger.log(`University soft deleted: ID=${id}`);
        return { success: true, message: 'Successfully soft deleted university.' };
      } else {
        throw new NotFoundException(`University with ID ${id} not found or already deleted.`);
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

      const allAcademicFieldNames = await this.getAllAcademicFieldNamesDefined();

      const universities = await Promise.all(
        uniEntities.map(async (uniEntity) => {
          return this._transformUniEntityToDisplayDto(uniEntity, allAcademicFieldNames);
        })
      );

      let columnsToInclude: string[];

      if (query.columns && query.columns.length > 0) {
        columnsToInclude = query.columns;
      } else {
        const academicFieldHeaders = allAcademicFieldNames.map((name) => name.toLowerCase().replace(/[^a-z0-9]/g, '_'));

        columnsToInclude = [
          'id',
          'university',
          'abbreviation',
          'latitude',
          'longitude',
          'logo',
          'rank',
          'type',
          'country',
          'location',
          'studentPopulation',
          'size',
          'year',
          'contact',
          'email',
          'website',
          'strength',
          'description',
          'exchange',
          ...academicFieldHeaders,
          'subjects',
          'academicFieldsCommaSeparated',
        ];
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

  private async exportCSV(universities: UniversityDisplayDto[], columns: string[]) {
    return new Promise<{ data: Buffer; filename: string; contentType: string }>((resolve, reject) => {
      const csvColumns = columns.map((col) => {
        if (col.includes('_')) {
          return col
            .split('_')
            .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
        }
        if (col === 'id') return 'ID';
        if (col === 'academicFieldsCommaSeparated') return 'Academic Fields';
        return col.charAt(0).toUpperCase() + col.slice(1);
      });

      const stringifier = stringify({
        header: true,
        columns: columns.map((col, index) => ({ key: col, header: csvColumns[index] })),
      });
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
          row[col] = u[col];
        });
        stringifier.write(row);
      });

      stringifier.end();
    });
  }

  private async exportExcel(universities: UniversityDisplayDto[], columns: string[]) {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Universities');

    worksheet.columns = columns.map((col) => {
      let headerText = col;
      if (col.includes('_')) {
        headerText = col
          .split('_')
          .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ');
      } else {
        if (col === 'id') headerText = 'ID';
        else if (col === 'academicFieldsCommaSeparated') headerText = 'Academic Fields';
        else headerText = col.charAt(0).toUpperCase() + col.slice(1);
      }
      return {
        header: headerText,
        key: col,
        width: 20,
      };
    });

    universities.forEach((u) => {
      const row: Record<string, any> = {};
      columns.forEach((col) => {
        row[col] = u[col];
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

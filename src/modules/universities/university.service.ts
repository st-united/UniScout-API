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
import { SearchLogService } from '@DashboardModule/services';
import { ExportUniversityDto, ExportFormat } from './dto/export-university.dto';
import { UniversityDto, UniversityDisplayDto } from './dto/university.dto';
import { GetSubjectsDto } from './dto/get-subject-dto';

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

const SIMILARITY_THRESHOLD = 0.4;
const DEFAULT_USER_LIMIT = 18;
const DEFAULT_ADMIN_LIMIT = 12;

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
                similarityThreshold: SIMILARITY_THRESHOLD,
              })
              .orWhere('word_similarity(:searchTerm,uni.location) > :similarityThreshold', {
                searchTerm,
                similarityThreshold: SIMILARITY_THRESHOLD,
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

    const typedQuery = query as GetUniversityDto;
    if (typedQuery?.subjectNames && typedQuery.subjectNames.length > 0) {
      const subjectSearchTerms = typedQuery.subjectNames.map((name: string) => name.toLowerCase());

      qb.andWhere(
        new Brackets((qbInner) => {
          subjectSearchTerms.forEach((searchTerm: string, index: number) => {
            qbInner.orWhere(
              new Brackets((subQb) => {
                subQb
                  .where('LOWER(subject.name) ILIKE :subjectSearchTerm' + index, {
                    ['subjectSearchTerm' + index]: `%${searchTerm}%`,
                  })
                  .orWhere(
                    'word_similarity(:subjectSearchTerm' +
                      index +
                      ', LOWER(subject.name)) > :similarityThreshold' +
                      index,
                    {
                      ['subjectSearchTerm' + index]: searchTerm,
                      ['similarityThreshold' + index]: SIMILARITY_THRESHOLD,
                    }
                  );
              })
            );
          });
        })
      );
      subjectSearchTerms.forEach((searchTerm: string, index: number) => {
        qb.addSelect(`similarity(LOWER(subject.name), :subjectSearchTerm${index})`, `subject_similarity_${index}`);
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
        qb.addOrderBy('subject_similarity_0', 'DESC', 'NULLS LAST');
      }
    } else {
      qb.addOrderBy('uni.rank', requestedSortOrder, nullsOrder);
    }

    const countryOrder = ['Vietnam', 'Korea', 'Japan', 'India', 'Australia', 'USA'];
    const caseWhenClauses = countryOrder.map((country, index) => `WHEN '${country}' THEN ${index + 1}`).join('\n');
    const defaultOrder = countryOrder.length + 1;

    qb.addSelect(
      `CASE "uni"."country"
            ${caseWhenClauses}
            ELSE ${defaultOrder} END`,
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
    defaultLimit = DEFAULT_USER_LIMIT
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

  private async _transformUniEntityToDisplayDto(
    uniEntity: UniEntity,
    allAcademicFieldNames: string[]
  ): Promise<UniversityDisplayDto> {
    const uniDto = plainToInstance(UniversityDto, uniEntity);

    const { exchange: uniDtoExchange, size, ...restUniDto } = uniDto;

    const transformedUni: UniversityDisplayDto = { ...restUniDto, size };
    if (uniEntity.logo) {
      transformedUni.logo = uniEntity.logo;
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

    for (const key in transformedUni) {
      if (
        key === 'exchange' ||
        key === 'size' ||
        key === 'academicFieldsCommaSeparated' ||
        key === 'subjectsList' ||
        key === 'logo'
      ) {
        continue;
      }

      if (transformedUni[key] === null || transformedUni[key] === undefined || transformedUni[key] === '') {
        transformedUni[key] = '-';
      }
    }

    return transformedUni;
  }

  private async _processUniversitySubjects(
    subjects: { subject: string; academicField: string }[]
  ): Promise<{ subjectEntities: SubjectEntity[]; academicFields: AcademicFieldEntity[] }> {
    if (!subjects || subjects.length === 0) {
      return { subjectEntities: [], academicFields: [] };
    }

    const subjectEntities: SubjectEntity[] = [];

    for (const { subject, academicField } of subjects) {
      const found = await this._subjectRepository.findOne({
        where: { name: subject },
        relations: ['academicFields'],
      });

      if (!found) {
        throw new NotFoundException(
          `Subject "${subject}" not found under academic field "${academicField}". Please check your Excel file or database.`
        );
      }

      subjectEntities.push(found);
    }

    const allAcademicFields = subjectEntities.flatMap((s) => s.academicFields);

    const uniqueAcademicFieldsMap = new Map<number, AcademicFieldEntity>();
    allAcademicFields.forEach((af) => {
      if (!uniqueAcademicFieldsMap.has(af.id)) {
        uniqueAcademicFieldsMap.set(af.id, af);
      }
    });
    const academicFields = Array.from(uniqueAcademicFieldsMap.values());

    return { subjectEntities, academicFields };
  }

  async findAll(
    query?: GetUniversityDto,

    isAdminContext = false
  ): Promise<UniversityPaginationResult> {
    try {
      const defaultLimit = isAdminContext ? DEFAULT_ADMIN_LIMIT : DEFAULT_USER_LIMIT;

      const { universities, totalCount, currentPage, limit } = await this._getUniversitiesPaginated(
        query,
        defaultLimit
      );

      if (query && query.search) {
        if (isAdminContext) {
          this._logger.log(`Admin search performed: "${query.search}"`);
        } else {
          this._logger.log(`User search performed: "${query.search}"`);
          await this._searchLogService.logSearch(query.search);
        }
      }

      return { universities, totalCount, currentPage, limit };
    } catch (error) {
      const errorPrefix = isAdminContext ? 'Error fetching universities for admin' : 'Error fetching universities';
      this._handleServiceError(error, errorPrefix);
    }
  }

  //View University
  async getUniversity(id: number): Promise<UniversityDisplayDto> {
    const university = await this._uniRepository.findOne({
      where: { id },
      relations: ['academicFields', 'subjects'],
    });

    if (!university) {
      throw new NotFoundException(`University with ID ${id} not found`);
    }

    if (university.university) {
      await this._searchLogService.logSearch(university.university);
    }

    const allAcademicFieldNames = await this.getAllAcademicFieldNamesDefined();
    return await this._transformUniEntityToDisplayDto(university, allAcademicFieldNames);
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

      const typedQuery = query as GetUniversityDto;
      if (typedQuery?.subjectNames && typedQuery.subjectNames.length > 0) {
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

  async getAllAvailableAcademicFields(): Promise<{ id: number; name: string }[]> {
    const result = await this._academicFieldRepository
      .createQueryBuilder('academicField')
      .select('academicField.id', 'id')
      .addSelect('academicField.name', 'name')
      .distinctOn(['academicField.id', 'academicField.name'])
      .orderBy('academicField.name', 'ASC')
      .getRawMany();
    return result.map((row) => ({ id: row.id, name: row.name }));
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

  async getAllSubjects(query?: GetSubjectsDto): Promise<SubjectEntity[]> {
    try {
      const qb = this._subjectRepository.createQueryBuilder('subject');
      qb.leftJoinAndSelect('subject.academicFields', 'academicField');

      if (query?.startsWith?.trim()) {
        const startsWithTerm = query.startsWith.trim().toLowerCase();
        qb.andWhere('LOWER(subject.name) ILIKE :startsWithTerm', { startsWithTerm: `${startsWithTerm}%` });
      } else if (query?.search?.trim()) {
        const searchTerm = query.search.trim().toLowerCase();
        qb.andWhere('LOWER(subject.name) ILIKE :searchTerm', { searchTerm: `%${searchTerm}%` });
      }

      if (query?.academicFieldId) {
        qb.andWhere('academicField.id = :academicFieldId', { academicFieldId: query.academicFieldId });
      }
      qb.orderBy('subject.name', 'ASC');

      const subjectEntities = await qb.getMany();
      return subjectEntities;
    } catch (error) {
      this._handleServiceError(error, 'getAllSubjects');
    }
  }

  //Create University
  async create(dto: CreateUniversityDto): Promise<UniversityDto> {
    const uni = this._uniRepository.create({
      university: dto.university,
      abbreviation: dto.abbreviation,
      latitude: dto.latitude,
      longitude: dto.longitude,
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

    if (dto.logo) {
      uni.logo = dto.logo;
    } else {
      uni.logo = '-';
    }

    let excelFilePathToDelete: string | null = null;

    if (dto.subjectsExcelFilePath) {
      excelFilePathToDelete = dto.subjectsExcelFilePath;
      try {
        const subjectsFromFile: { subject: string; academicField: string }[] = await this.extractSubjectsFromExcel(
          dto.subjectsExcelFilePath
        );
        const { subjectEntities, academicFields } = await this._processUniversitySubjects(subjectsFromFile);
        uni.subjects = subjectEntities;
        uni.academicFields = academicFields;
      } catch (error) {
        this._logger.error(`Error processing subjects from Excel for new university: ${error.message}`, error.stack);
        throw new BadRequestException(`Failed to process subjects from Excel: ${error.message}`);
      } finally {
        if (excelFilePathToDelete) {
          await this._deleteTempFile(excelFilePathToDelete);
        }
      }
    } else {
      uni.subjects = [];
      uni.academicFields = [];
    }

    try {
      const savedUni = await this._uniRepository.save(uni);
      return plainToInstance(UniversityDto, savedUni);
    } catch (error) {
      if ((error as any).code === '23505') {
        if (dto.logo && dto.logo !== '-') {
          await this._deleteTempFile(dto.logo);
        }
        throw new BadRequestException('University with this name already exists.');
      }
      Logger.error(`Error creating university: ${(error as Error).message}`, (error as Error).stack);
      if (dto.logo && dto.logo !== '-') {
        await this._deleteTempFile(dto.logo);
      }
      throw new InternalServerErrorException('Failed to create university.');
    }
  }

  public async extractSubjectsFromExcel(filePath: string): Promise<{ subject: string; academicField: string }[]> {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath);

    const worksheet = workbook.worksheets[0];
    const selectedSubjects: Set<string> = new Set();

    const academicFieldNameMap: Record<string, string> = {
      'Agricultural and Veterinary Sciences': 'agricultural_veterinary_sciences',
      'Arts and Design': 'arts_design',
      'Business, Management and Law': 'business_management_law',
      'Education and Training': 'education_training',
      'Engineering and Technology': 'engineering_technology',
      'Health and Medicine': 'health_medicine',
      'Humanities and Languages': 'humanities_languages',
      ICT: 'ict',
      'Natural Sciences': 'natural_sciences',
      'Social and Behavioral Sciences': 'social_behavioral_sciences',
      Services: 'services',
      'Transport, Safety and Security, Military': 'transport_safety_security_military',
    };

    worksheet.eachRow((row) => {
      const field1Raw = row.getCell(1).text?.trim();
      const subject1 = row.getCell(2).text?.trim();
      const bool1 = row.getCell(4).value;

      const field2Raw = row.getCell(5).text?.trim();
      const subject2 = row.getCell(6).text?.trim();
      const bool2 = row.getCell(8).value;

      const field1 = academicFieldNameMap[field1Raw];
      const field2 = academicFieldNameMap[field2Raw];

      if ((bool1 === true || String(bool1).toUpperCase() === 'TRUE') && subject1 && field1) {
        selectedSubjects.add(`${field1}|||${subject1}`);
      }

      if ((bool2 === true || String(bool2).toUpperCase() === 'TRUE') && subject2 && field2) {
        selectedSubjects.add(`${field2}|||${subject2}`);
      }
    });

    return [...selectedSubjects].map((entry) => {
      const [academicField, subject] = entry.split('|||');
      return { subject, academicField };
    });
  }

  //Update University
  async updateUniversity(id: number, dto: UpdateUniversityDto): Promise<UniversityDto> {
    const university = await this._uniRepository.findOne({ where: { id } });

    if (!university) {
      if (dto.logo && dto.logo !== '-') {
        await this._deleteTempFile(dto.logo);
      }
      throw new NotFoundException(`University with ID ${id} not found`);
    }

    if (dto.logo !== undefined) {
      if (university.logo && university.logo !== '-') {
        await this.deleteLogoFile(university.logo);
      }
      university.logo = dto.logo === null ? '-' : dto.logo;
    }

    const updateData: Partial<UpdateUniversityDto> = { ...dto };
    delete updateData.subjectsExcelFilePath;

    let excelFilePathToDelete: string | null = null;

    if (dto.subjectsExcelFilePath) {
      excelFilePathToDelete = dto.subjectsExcelFilePath;
      try {
        const subjectsFromFile: { subject: string; academicField: string }[] = await this.extractSubjectsFromExcel(
          dto.subjectsExcelFilePath
        );
        const { subjectEntities, academicFields } = await this._processUniversitySubjects(subjectsFromFile);
        university.subjects = subjectEntities;
        university.academicFields = academicFields;
      } catch (error) {
        this._logger.error(`Error processing subjects from Excel for university update: ${error.message}`, error.stack);
        throw new BadRequestException(`Failed to process subjects from Excel: ${error.message}`);
      } finally {
        if (excelFilePathToDelete) {
          await this._deleteTempFile(excelFilePathToDelete);
        }
      }
    }

    Object.assign(university, updateData);

    try {
      const savedUniversity = await this._uniRepository.save(university);
      return plainToInstance(UniversityDto, savedUniversity);
    } catch (error) {
      if ((error as any).code === '23505') {
        if (dto.logo && dto.logo !== '-') {
          await this._deleteTempFile(dto.logo);
        }
        throw new BadRequestException('University with this name already exists.');
      }
      Logger.error(`Error updating university: ${(error as Error).message}`, (error as Error).stack);
      if (dto.logo && dto.logo !== '-') {
        await this._deleteTempFile(dto.logo);
      }
      throw new InternalServerErrorException('Failed to update university.');
    }
  }

  //Delete University
  async deleteUniversity(id: number): Promise<{ success: boolean; message: string }> {
    this._logger.log(`Soft deletion attempt: University ID=${id}`);

    try {
      const university = await this._getUniversityById(id, false);
      if (university.logo && university.logo !== '-') {
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
      const fileName = basename(logoFilename);
      const filePath = join(process.cwd(), 'uploads', 'university-logos', fileName);
      await unlink(filePath);
      this._logger.log(`Successfully deleted logo file: ${filePath}`);
    } catch (error) {
      this._logger.warn(`Failed to delete logo file ${logoFilename}: ${error.message}`);
    }
  }

  private async _deleteTempFile(filePath: string): Promise<void> {
    try {
      await unlink(filePath);
      this._logger.log(`Successfully deleted temporary file: ${filePath}`);
    } catch (error) {
      this._logger.warn(`Failed to delete temporary file ${filePath}: ${error.message}`);
    }
  }

  //Export University
  async exportUniversities(
    query: Omit<ExportUniversityDto, 'format'>,
    format: ExportFormat
  ): Promise<{ data: Buffer; filename: string; contentType: string }> {
    try {
      const qb = this._uniRepository
        .createQueryBuilder('uni')
        .leftJoinAndSelect('uni.academicFields', 'academicField')
        .leftJoinAndSelect('uni.subjects', 'subject');

      await this._applyFilters(qb, query);
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
          'subjectsList',
          ...academicFieldHeaders,
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
        if (col === 'subjectsList') return 'Subjects';
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
          row[col] = u[col] !== undefined ? u[col] : '-';
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
        else if (col === 'subjectsList') headerText = 'Subjects';
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
        row[col] = u[col] !== undefined ? u[col] : '-';
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

  async createUniversity(createUniversityDto: CreateUniversityDto): Promise<UniEntity> {
    const newUniversity = this._uniRepository.create(createUniversityDto);
    return this._uniRepository.save(newUniversity);
  }
}

import {
  Injectable,
  NotFoundException,
  Logger,
  InternalServerErrorException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { join, basename } from 'path';
import { unlink } from 'fs/promises';
import * as ExcelJS from 'exceljs';
import { stringify } from 'csv-stringify';

import { UniEntity } from './entities/uni.entity';
import { CreateUniversityDto } from './dto/create-university.dto';
import { UpdateUniversityDto } from './dto/update-university.dto';
import { GetUniversityDto, FieldsFilterDto } from './dto/get-university.dto';
import { ExportUniversityDto, ExportFormat } from './dto/export-university.dto';
import { TrackingService } from '@DashboardModule/services/tracker.service';
import { GeoIpService } from '@DashboardModule/services/geoip.service';
import { SearchLogService } from '@DashboardModule/services/search-log.service';

@Injectable()
export class UniversityService {
  private readonly logger = new Logger(UniversityService.name);
  private readonly FUZZY_THRESHOLD: number = parseFloat(process.env.FUZZY_SEARCH_THRESHOLD || '0.3');

  constructor(
    @InjectRepository(UniEntity)
    private readonly uniRepository: Repository<UniEntity>,
    private readonly trackingService: TrackingService,
    private readonly geoIpService: GeoIpService,
    private readonly searchLogService: SearchLogService
  ) {}

  async create(createDto: CreateUniversityDto & { logo: string }): Promise<UniEntity> {
    try {
      const uni = this.uniRepository.create({
        ...createDto,
      });
      return await this.uniRepository.save(uni);
    } catch (error) {
      this.logger.error(`Failed to create university: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Failed to create university');
    }
  }

  async findAll(query?: GetUniversityDto, ip?: string): Promise<UniEntity[]> {
    try {
      if (ip) {
        const country = await this.geoIpService.getCountryFromIp(ip);
        if (country) {
          await this.trackingService.incrementCountryTraffic(country);
        }
      }

      const qb = this.uniRepository.createQueryBuilder('uni');

      if (query?.search) {
        qb.andWhere('similarity(uni.university, :search) > :threshold', {
          search: query.search,
          threshold: this.FUZZY_THRESHOLD,
        });
        qb.orderBy('similarity(uni.university, :search)', query.sortOrder || 'ASC');

        if (query.country) {
          await this.searchLogService.logSearch(query.search, query.country);
        }
      } else {
        qb.orderBy('uni.rank', query.sortOrder || 'ASC');
      }

      if (query?.rank) {
        qb.andWhere('uni.rank = :rank', { rank: query.rank });
      }

      if (query?.type) {
        qb.andWhere('uni.type = :type', { type: query.type });
      }

      if (query?.country) {
        qb.andWhere('uni.country = :country', { country: query.country });
      }

      if (query?.location) {
        qb.andWhere('uni.location ILIKE :location', { location: `%${query.location}%` });
      }

      if (query?.size) {
        qb.andWhere('uni.size = :size', { size: query.size });
      }

      if (query?.fields) {
        const fields = query.fields;
        Object.entries(fields).forEach(([key, value]) => {
          if (value === true) {
            qb.andWhere(`uni.${key} = true`);
          }
        });
      }

      const page = query?.page ?? 1;
      const limit = query?.limit ?? 16;
      qb.skip((page - 1) * limit).take(limit);

      return await qb.getMany();
    } catch (error) {
      this.logger.error(`Error fetching universities: ${error.message}`, error.stack);
      throw new InternalServerErrorException(`Failed to fetch universities: ${error.message}`);
    }
  }

  async getUniversity(country: string, id: number): Promise<UniEntity> {
    try {
      const university = await this.uniRepository.findOne({ where: { id, country } });

      if (!university) {
        throw new NotFoundException(`University with ID ${id} not found in ${country}`);
      }

      return university;
    } catch (error) {
      this.logger.error(`Error fetching university: ${error.message}`, error.stack);
      if (error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException(`Database error: ${error.message}`);
    }
  }

  async getValidCountries(): Promise<string[]> {
    const countries = await this.uniRepository
      .createQueryBuilder('uni')
      .select('DISTINCT uni.country', 'country')
      .getRawMany();

    return countries.map((c) => c.country);
  }

  async findUniversity(name: string, country: string): Promise<UniEntity | null> {
    try {
      return await this.uniRepository
        .createQueryBuilder('uni')
        .where('uni.country = :country', { country })
        .andWhere('similarity(uni.university, :name) > :threshold', { name, threshold: this.FUZZY_THRESHOLD }) // Use configurable threshold here too
        .orderBy('similarity(uni.university, :name)', 'DESC')
        .getOne();
    } catch (error) {
      this.logger.error(`Search error: ${error.message}`, error.stack);
      throw new InternalServerErrorException(`Database search error: ${error.message}`);
    }
  }

  async fuzzySearch(term: string, page = 1, limit = 16): Promise<UniEntity[]> {
    try {
      const offset = (page - 1) * limit;
      return await this.uniRepository.query(
        `SELECT * FROM uni WHERE similarity(university, $1) > $2 ORDER BY similarity(university, $1) DESC LIMIT $3 OFFSET $4`,
        [term, this.FUZZY_THRESHOLD, limit, offset]
      );
    } catch (error) {
      this.logger.error(`Similarity search error: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Failed to perform fuzzy search');
    }
  }

  async updateUniversity(country: string, id: number, dto: UpdateUniversityDto): Promise<UniEntity | null> {
    try {
      const existing = await this.uniRepository.findOne({ where: { id, country } });

      if (!existing) return null;

      if (dto.logo && dto.logo !== existing.logo) {
        if (existing.logo) {
          await this.deleteLogoFile(existing.logo);
        }
      }

      await this.uniRepository.update({ id, country }, dto);
      return this.uniRepository.findOne({ where: { id, country } });
    } catch (error) {
      this.logger.error(`Error updating university: ${error.message}`, error.stack);
      throw new InternalServerErrorException(`Database error: ${error.message}`);
    }
  }

  async deleteUniversity(country: string, id: number): Promise<{ success: boolean; message: string }> {
    this.logger.log(`Deletion attempt: University ID=${id}, Country=${country}`);

    try {
      const university = await this.uniRepository.findOne({ where: { id, country } });

      if (!university) {
        this.logger.warn(`Deletion failed: University not found. ID=${id}, Country=${country}`);
        return { success: false, message: 'University not found.' };
      }

      if (university.logo) {
        await this.deleteLogoFile(university.logo);
      }

      const result = await this.uniRepository.delete({ id, country });

      if (result.affected && result.affected > 0) {
        this.logger.log(`University deleted: ID=${id}, Country=${country}`);
        return { success: true, message: 'Successfully deleted university.' };
      } else {
        this.logger.warn(`Deletion failed (unknown reason). ID=${id}, Country=${country}`);
        return { success: false, message: 'Deletion failed.' };
      }
    } catch (error) {
      this.logger.error(`Delete error for University ID=${id}, Country=${country}: ${error.message}`, error.stack);
      throw new InternalServerErrorException(`Database error: ${error.message}`);
    }
  }

  async exportUniversities(
    query: Omit<ExportUniversityDto, 'format'>,
    format: ExportFormat
  ): Promise<{ data: Buffer; filename: string; contentType: string }> {
    try {
      const qb = this.uniRepository.createQueryBuilder('uni');

      if (query.country && query.country.length > 0) {
        qb.andWhere('uni.country IN (:...country)', { country: query.country });
      }

      if (query.minRank) {
        qb.andWhere('uni.rank >= :minRank', { minRank: query.minRank });
      }

      if (query.maxRank) {
        qb.andWhere('uni.rank <= :maxRank', { maxRank: query.maxRank });
      }

      if (query.type) {
        qb.andWhere('uni.type = :type', { type: query.type });
      }

      if (query.fields) {
        const fields: FieldsFilterDto = query.fields;
        Object.entries(fields).forEach(([key, value]) => {
          if (value === true) {
            qb.andWhere(`uni.${key} = true`);
          }
        });
      }

      const universities = await qb.getMany();

      const allowedColumns = [
        'id',
        'university',
        'logo',
        'rank',
        'type',
        'country',
        'location',
        'latitude',
        'longitude',
        'student',
        'year',
        'contact',
        'email',
        'website',
        'strength',
        'description',
        'exchange',
        'size',
        'isPublic',
        'academicStaff',
        'scholarship',
        'internationalStudent',
        'costLiving',
        'costTuition',
        'costAccommodation',
        'language',
        'studentSatisfaction',
        'graduateEmploymentRate',
        'nobelPrize',
        'rankingCategory',
        'gdp',
      ];

      const columnsToInclude = query.columns?.filter((col) => allowedColumns.includes(col)) || allowedColumns;

      if (format === ExportFormat.CSV) {
        return await this.exportCSV(universities, columnsToInclude);
      } else if (format === ExportFormat.EXCEL) {
        return await this.exportExcel(universities, columnsToInclude);
      } else {
        throw new BadRequestException('Unsupported export format');
      }
    } catch (error) {
      this.logger.error(`Export error: ${error.message}`, error.stack);
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

  private async deleteLogoFile(logoFilename: string): Promise<void> {
    try {
      const filePath = join(process.cwd(), 'uploads', 'university', basename(logoFilename));
      await unlink(filePath);
    } catch (error) {
      this.logger.warn(`Failed to delete logo file ${logoFilename}: ${error.message}`);
    }
  }
}

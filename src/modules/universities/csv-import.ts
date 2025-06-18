import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UniEntity } from './entities/uni.entity';
import * as fs from 'fs';
import * as Papa from 'papaparse';

@Injectable()
export class CsvImport {
  private readonly _logger = new Logger(CsvImport.name);

  constructor(@InjectRepository(UniEntity) private uniRepo: Repository<UniEntity>) {}

  async importCsv(filePath: string): Promise<void> {
    const csvData = fs.readFileSync(filePath, 'utf8');

    this._logger.log(`\nImporting universities from: ${filePath}`);
    const results = await new Promise<Papa.ParseResult<any>>((resolve, reject) => {
      Papa.parse(csvData, {
        header: true,
        skipEmptyLines: true,
        dynamicTyping: true,
        transformHeader: (header: string) => header.trim().toLowerCase(),
        complete: resolve,
        error: reject,
      });
    });

    const records = results.data;
    const totalRecords = records.length;

    for (let i = 0; i < totalRecords; i++) {
      const record = records[i];
      const entity = this.mapCsvToEntity(record, i);

      await this.uniRepo.upsert(entity, ['university']);
      this._logger.log(`Processed record ${i + 1}/${totalRecords}: ${entity.university}`);
    }

    const totalCount = await this.uniRepo.count();
    this._logger.log(`Import completed! Total records: ${totalCount}`);
  }

  private mapCsvToEntity(record: any, importOrder?: number): Partial<UniEntity> {
    const academicFields: string[] = [];

    const fieldColumns = [
      'agricultural_food_science',
      'arts_design',
      'economics_business_management',
      'law_political_science',
      'medicine_pharmacy_health_sciences',
      'science_engineering',
      'social_sciences_humanities',
      'sports_physical_education',
      'technology',
      'others',
    ];

    fieldColumns.forEach((column) => {
      const parsedBoolean = this.parseBoolean(record[column]);
      if (parsedBoolean === true) {
        const fieldName = column.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
        academicFields.push(fieldName);
      }
    });

    return {
      university: record.university?.toString().trim() || '',
      latitude: this.parseNumber(record.latitude),
      longitude: this.parseNumber(record.longitude),
      logo: record.logo?.toString().trim() || null,
      rank: this.parseNumber(record.rank),
      type: record.type?.toString().trim() || null,
      country: record.country?.toString().trim() || '',
      location: record.location?.toString().trim() || null,
      studentPopulation: this.parseNumber(record.student),
      year: this.parseNumber(record.year),
      contact: record.contact?.toString().trim() || null,
      email: record.email?.toString().trim() || null,
      website: record.website?.toString().trim() || null,
      strength: record.strength?.toString().trim() || null,
      description: record.description?.toString().trim() || null,
      exchange: this.parseBoolean(record.exchange),
      academicFields: academicFields,
    };
  }

  private parseNumber(value: any): number | null {
    if (value === null || value === undefined || value === '' || value === 'NA') {
      return null;
    }
    const parsed = parseFloat(value.toString());
    return isNaN(parsed) ? null : parsed;
  }

  private parseBoolean(value: any): boolean | null {
    if (value === null || value === undefined || value === '') {
      return null;
    }
    const stringValue = value.toString().toLowerCase().trim();
    return stringValue === 'true' || stringValue === '1'
      ? true
      : stringValue === 'false' || stringValue === '0'
      ? false
      : null;
  }

  async getStats(): Promise<any> {
    const totalCount = await this.uniRepo.count();
    return { totalCount };
  }
}

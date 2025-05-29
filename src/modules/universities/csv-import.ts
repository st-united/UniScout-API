import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UniEntity } from './entities/uni.entity';
import { LocationEntity } from './entities/location.entity';

import * as fs from 'fs';
import * as Papa from 'papaparse';

@Injectable()
export class CsvImport {
  constructor(
    @InjectRepository(UniEntity) private uniRepo: Repository<UniEntity>,
    @InjectRepository(LocationEntity) private locationRepo: Repository<LocationEntity>
  ) {}

  async clearAllData(): Promise<void> {
    console.log('Clearing all university data...');
    await this.uniRepo.delete({});
    console.log('Clearing all location data...');
    await this.locationRepo.delete({});
    console.log('All data cleared.');
  }

  async importCoordinates(filePath: string): Promise<void> {
    console.log(`\nImporting coordinates from: ${filePath}`);
    const csvData = fs.readFileSync(filePath, 'utf8');

    try {
      await this.uniRepo.delete({});
      await this.locationRepo.delete({});

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

      const validCoords = results.data
        .filter((row) => row.country && row.location)
        .map((row) => ({
          country: row.country.toString().trim(),
          location: row.location.toString().trim(),
          latitude: parseFloat(row.latitude),
          longitude: parseFloat(row.longitude),
        }));

      await this.locationRepo.save(validCoords);
      console.log(`Coordinates import completed! Total: ${validCoords.length}`);
    } catch (error) {
      console.error('Failed to import coordinates:', error);
      throw error;
    }
  }

  async importCsv(filePath: string, clearExisting = true): Promise<void> {
    const csvData = fs.readFileSync(filePath, 'utf8');

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

    if (clearExisting) {
      console.log('Clearing existing university data...');
      await this.uniRepo.delete({});
    }

    await this.ensureLocationsExist(records);

    const batchSize = 100;
    for (let i = 0; i < records.length; i += batchSize) {
      const batch = records.slice(i, i + batchSize);
      const entities = batch.map((record, idx) => this.mapCsvToEntity(record, i + idx));
      await this.uniRepo.upsert(entities, ['university']);
      console.log(`Processed batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(records.length / batchSize)}`);
    }

    const totalCount = await this.uniRepo.count();
    console.log(`Import completed! Total records: ${totalCount}`);
  }

  private async ensureLocationsExist(records: any[]) {
    const locationSet = new Set<string>();
    for (const row of records) {
      if (row.country && row.location) {
        locationSet.add(`${row.country.trim()}::${row.location.trim()}`);
      }
    }

    const needed = Array.from(locationSet).map((locStr) => {
      const [country, location] = locStr.split('::');
      return { country, location };
    });

    const existing = await this.locationRepo.find();
    const existingSet = new Set(existing.map((e) => `${e.country}::${e.location}`));

    const missing = needed.filter(({ country, location }) => !existingSet.has(`${country}::${location}`));

    if (missing.length > 0) {
      console.warn(`Missing locations:`, missing);
      const newEntries = missing.map(({ country, location }) => ({
        country,
        location,
        latitude: null,
        longitude: null,
      }));
      await this.locationRepo.save(newEntries);
      console.log(`Inserted ${newEntries.length} new location(s).`);
    }
  }

  private mapCsvToEntity(record: any, importOrder?: number): Partial<UniEntity> {
    return {
      university: record.university?.toString().trim() || '',
      logo: record.logo?.toString().trim() || null,
      rank: this.parseNumber(record.rank),
      type: record.type?.toString().trim() || null,
      country: record.country?.toString().trim() || 'Korea',
      location: record.location?.toString().trim() || null,
      student: this.parseNumber(record.student),
      year: this.parseNumber(record.year),
      contact: record.contact?.toString().trim() || null,
      email: record.email?.toString().trim() || null,
      website: record.website?.toString().trim() || null,
      strength: record.strength?.toString().trim() || null,
      description: record.description?.toString().trim() || null,

      exchange: this.parseBoolean(record.exchange),
      agricultural_food_science: this.parseBoolean(record.agricultural_food_science),
      arts_design: this.parseBoolean(record.arts_design),
      economics_business_management: this.parseBoolean(record.economics_business_management),
      engineering: this.parseBoolean(record.engineering),
      law_political_science: this.parseBoolean(record.law_political_science),
      medicine_pharmacy_health_sciences: this.parseBoolean(record.medicine_pharmacy_health_sciences),
      physical_science: this.parseBoolean(record.physical_science),
      social_sciences_humanities: this.parseBoolean(record.social_sciences_humanities),
      sports_physical_education: this.parseBoolean(record.sports_physical_education),
      technology: this.parseBoolean(record.technology),
      theology: this.parseBoolean(record.theology),
    };
  }

  private parseNumber(value: any): number | null {
    if (value === null || value === undefined || value === '' || value === 'NA') {
      return null;
    }
    const parsed = parseInt(value.toString(), 10);
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

  async getStats() {
    const count = await this.uniRepo.count();
    return { totalUniversities: count };
  }
}

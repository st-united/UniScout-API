import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AusUniEntity } from './entities/aus.entity';
import { IndUniEntity } from './entities/ind.entity';
import { JapUniEntity } from './entities/jap.entity';
import { KorUniEntity } from './entities/kor.entity';
import { UsaUniEntity } from './entities/usa.entity';
import { VnUniEntity } from './entities/vn.entity';
import { LocationEntity } from './entities/location.entity';

import * as fs from 'fs';
import * as Papa from 'papaparse';

type CountryEntity = AusUniEntity | IndUniEntity | JapUniEntity | KorUniEntity | UsaUniEntity | VnUniEntity;

type CountryCode = 'aus' | 'ind' | 'jap' | 'kor' | 'usa' | 'vn';

@Injectable()
export class CsvImport {
  private repositories: Record<CountryCode, Repository<any>>;

  constructor(
    @InjectRepository(AusUniEntity) private ausRepo: Repository<AusUniEntity>,
    @InjectRepository(IndUniEntity) private indRepo: Repository<IndUniEntity>,
    @InjectRepository(JapUniEntity) private japRepo: Repository<JapUniEntity>,
    @InjectRepository(KorUniEntity) private korRepo: Repository<KorUniEntity>,
    @InjectRepository(UsaUniEntity) private usaRepo: Repository<UsaUniEntity>,
    @InjectRepository(VnUniEntity) private vnRepo: Repository<VnUniEntity>,
    @InjectRepository(LocationEntity) private locationRepo: Repository<LocationEntity>
  ) {
    this.repositories = {
      aus: this.ausRepo,
      ind: this.indRepo,
      jap: this.japRepo,
      kor: this.korRepo,
      usa: this.usaRepo,
      vn: this.vnRepo,
    };
  }

  async clearAllData(): Promise<void> {
    console.log('Clearing all university data...');
    for (const repo of Object.values(this.repositories)) {
      await repo.delete({});
    }
    console.log('Clearing all location data...');
    await this.locationRepo.delete({});
    console.log('All data cleared.');
  }

  async importCoordinates(filePath: string): Promise<void> {
    console.log(`\nImporting coordinates from: ${filePath}`);

    const csvData = fs.readFileSync(filePath, 'utf8');

    try {
      console.log('Deleting all universities before deleting locations...');
      for (const repo of Object.values(this.repositories)) {
        await repo.delete({});
      }

      console.log('Deleting all locations...');
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

  /**
   * Import CSV for a country
   * @param filePath path to CSV file
   * @param country country code
   * @param clearExisting if true, deletes existing records before import
   */
  async importCsv(filePath: string, country: CountryCode, clearExisting = true): Promise<void> {
    const repository = this.repositories[country];
    if (!repository) {
      throw new Error(`Invalid country code: ${country}`);
    }

    // Read and parse CSV with lowercase headers for consistency
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

    console.log(`Parsed ${results.data.length} records for ${country.toUpperCase()}`);

    // Ensure referenced locations exist
    await this.ensureLocationsExist(results.data, country);

    // Clear existing data if flag is set or if any data exists
    if (clearExisting) {
      console.log(`Clearing existing ${country.toUpperCase()} data...`);
      await repository.delete({});
    } else {
      const existingCount = await repository.count();
      if (existingCount > 0) {
        console.log(
          `Skipping import for ${country.toUpperCase()} because data already exists (${existingCount} records).`
        );
        return;
      }
    }

    // Batch import with import_order set as the index
    const batchSize = 100;
    for (let i = 0; i < results.data.length; i += batchSize) {
      const batch = results.data.slice(i, i + batchSize);
      const entities = batch.map((record, idx) => this.mapCsvToEntity(record, country, i + idx));

      await repository.upsert(entities, ['university']);
      console.log(`Processed batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(results.data.length / batchSize)}`);
    }

    const totalCount = await repository.count();
    console.log(`Import completed! ${country.toUpperCase()} total records: ${totalCount}`);
  }

  private async ensureLocationsExist(records: any[], country: CountryCode) {
    const countryName = this.getCountryName(country);

    const existingLocations = await this.locationRepo.find({
      where: { country: countryName },
      select: ['location'],
    });

    const existingLocationSet = new Set(existingLocations.map((loc) => loc.location));

    const csvLocations = new Set<string>();
    for (const record of records) {
      if (record.location) {
        csvLocations.add(record.location.toString().trim());
      }
    }

    const missingLocations = [...csvLocations].filter((loc) => !existingLocationSet.has(loc));

    if (missingLocations.length > 0) {
      console.warn(`Warning: Missing locations for country ${countryName}:`, missingLocations);
      const newLocations = missingLocations.map((loc) => ({
        country: countryName,
        location: loc,
        latitude: null,
        longitude: null,
      }));

      await this.locationRepo.save(newLocations);
      console.log(`Inserted ${newLocations.length} missing locations into location table.`);
    }
  }

  private mapCsvToEntity(record: any, country: CountryCode, importOrder?: number): Partial<CountryEntity> {
    const baseEntity = {
      university: record.university?.toString().trim() || '',
      logo: record.logo?.toString().trim() || null,
      rank: this.parseNumber(record.rank),
      type: record.type?.toString().trim() || null,
      location: record.location?.toString().trim() || null,
      student: this.parseNumber(record.student),
      year: this.parseNumber(record.year),
      contact: record.contact?.toString().trim() || null,
      email: record.email?.toString().trim() || null,
      website: record.website?.toString().trim() || null,
      strength: record.strength?.toString().trim() || null,
      description: record.description?.toString().trim() || null,

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

      import_order: importOrder ?? null, // <-- important to preserve import order
    };

    switch (country) {
      case 'aus':
        return {
          ...baseEntity,
          country: 'Australia',
          theology: this.parseBoolean(record.theology),
        };

      case 'jap':
      case 'kor':
        return {
          ...baseEntity,
          country: country === 'jap' ? 'Japan' : 'Korea',
          exchange: this.parseBoolean(record.exchange),
        };

      default:
        return {
          ...baseEntity,
          country: this.getCountryName(country),
        };
    }
  }

  private getCountryName(country: CountryCode): string {
    const countryNames = {
      aus: 'Australia',
      ind: 'India',
      jap: 'Japan',
      kor: 'Korea',
      usa: 'USA',
      vn: 'Vietnam',
    };
    return countryNames[country];
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

  async getStats(country?: CountryCode) {
    if (country) {
      const count = await this.repositories[country].count();
      return { [country]: count };
    }

    const stats = {};
    for (const [countryCode, repo] of Object.entries(this.repositories)) {
      stats[countryCode] = await repo.count();
    }
    return stats;
  }
}

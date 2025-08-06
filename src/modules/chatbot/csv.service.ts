import { Injectable, Logger } from '@nestjs/common';
import { stringify } from 'csv-stringify';
import * as path from 'path';
import * as fs from 'fs';
import { UniEntity } from '@UniversitiesModule/entities';

@Injectable()
export class CsvService {
  private readonly logger = new Logger(CsvService.name);
  private readonly tempDir = path.join(process.cwd(), 'temp_exports');

  constructor() {
    this.ensureTempDirectoryExists();
  }

  private ensureTempDirectoryExists() {
    try {
      if (!fs.existsSync(this.tempDir)) {
        fs.mkdirSync(this.tempDir, { recursive: true });
        this.logger.log(`Created temporary export directory: ${this.tempDir}`);
      }
    } catch (error) {
      this.logger.error(`Failed to create temporary export directory: ${error.message}`);
    }
  }

  /**
   * Generates a CSV file from an array of UniEntity objects.
   *
   * @param universities An array of UniEntity objects to export.
   * @param country The country filter used, for filename.
   * @param limit The limit used, for filename.
   * @returns The full filename (e.g., 'top_universities_Japan_123456789.csv') of the generated file.
   * @throws Error if file generation fails.
   */
  async generateUniversityCsv(universities: UniEntity[], country: string, limit: number): Promise<string> {
    this.logger.log(`Starting CSV generation for ${universities.length} universities.`);

    const columns = [
      { key: 'rank', header: 'Rank' },
      { key: 'university', header: 'University Name' },
      { key: 'country', header: 'Country' },
      { key: 'location', header: 'Location' },
      { key: 'website', header: 'Website' },
      { key: 'studentPopulation', header: 'Student Population' },
    ];

    const data = universities.map((uni) => ({
      rank: uni.rank || 'N/A',
      university: uni.university || 'N/A',
      country: uni.country || 'N/A',
      location: uni.location || 'N/A',
      website: uni.website || 'N/A',
      studentPopulation: uni.studentPopulation || 'N/A',
    }));

    const csvString = await new Promise<string>((resolve, reject) => {
      stringify(
        data,
        {
          header: true,
          columns: columns,
        },
        (err, output) => {
          if (err) {
            this.logger.error(`Error during CSV stringification: ${err.message}`);
            return reject(new Error('Failed to stringify CSV data'));
          }
          resolve(output);
        }
      );
    });

    const fullFilename = `top_universities_${country.replace(/\s/g, '_')}_${limit}_${Date.now()}.csv`;
    const filePath = path.join(this.tempDir, fullFilename);

    try {
      fs.writeFileSync(filePath, csvString);
      this.logger.log(`CSV file successfully saved to: ${filePath}`);
      return fullFilename;
    } catch (error) {
      this.logger.error(`Error writing CSV file to disk: ${error.message}`);
      throw new Error('Failed to generate CSV file');
    }
  }

  /**
   * Retrieves the full file system path for a generated CSV file.
   * @param filename The name of the CSV file (including extension) to retrieve.
   * @returns The full path to the CSV file on the server's file system.
   */
  getCsvFilePath(filename: string): string {
    const filePath = path.join(this.tempDir, filename);
    this.logger.log(`Retrieving CSV file path: ${filePath}`);
    return filePath;
  }
}

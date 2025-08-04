// src/modules/chatbot/csv.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { stringify } from 'csv-stringify';
import * as path from 'path';
import * as fs from 'fs'; // Using 'fs' directly as seen in your provided code
import { UniEntity } from '@UniversitiesModule/entities'; // Ensure this alias is correctly configured in tsconfig.json

@Injectable()
export class CsvService {
  private readonly logger = new Logger(CsvService.name);
  // Define a directory to store temporary export files (e.g., in project root)
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

    // Define columns for the CSV output, matching UniEntity properties
    const columns = [
      { key: 'rank', header: 'Rank' },
      { key: 'university', header: 'University Name' },
      { key: 'country', header: 'Country' },
      { key: 'location', header: 'Location' }, // Using 'location' from UniEntity
      { key: 'website', header: 'Website' },
      { key: 'studentPopulation', header: 'Student Population' }, // Using 'studentPopulation' from UniEntity
    ];

    // Map UniEntity objects to a plain object array suitable for csv-stringify
    const data = universities.map((uni) => ({
      rank: uni.rank || 'N/A', // Handle potential null/undefined
      university: uni.university || 'N/A',
      country: uni.country || 'N/A',
      location: uni.location || 'N/A',
      website: uni.website || 'N/A',
      studentPopulation: uni.studentPopulation || 'N/A',
    }));

    // Use csv-stringify to convert data to CSV string
    const csvString = await new Promise<string>((resolve, reject) => {
      stringify(
        data,
        {
          header: true, // Include the header row
          columns: columns, // Specify column order and headers
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
      fs.writeFileSync(filePath, csvString); // Synchronous write for simplicity, can be async with fs/promises
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

import { Injectable, Logger } from '@nestjs/common';
import * as ExcelJS from 'exceljs';
import * as path from 'path';
import * as fs from 'fs';
import { UniEntity } from '@UniversitiesModule/entities';

@Injectable()
export class ExcelService {
  private readonly logger = new Logger(ExcelService.name);

  // Define the correct temporary directory here
  private readonly tempExcelDir = path.join(process.cwd(), 'temp_exports');

  constructor() {
    if (!fs.existsSync(this.tempExcelDir)) {
      fs.mkdirSync(this.tempExcelDir, { recursive: true });
      this.logger.log(`Created directory: ${this.tempExcelDir}`);
    }
  }

  async generateTopUniversitiesExcel(universities: UniEntity[], country: string, limit: number): Promise<string> {
    const filename = `top_universities_${country.replace(/\s/g, '_')}_${limit}_${Date.now()}.xlsx`;
    // Use the correctly defined path for saving the file
    const outputPath = path.join(this.tempExcelDir, filename);

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(`Top ${limit} Universities in ${country}`);

    worksheet.columns = [
      { header: 'Rank', key: 'rank', width: 10 },
      { header: 'University', key: 'university', width: 40 },
      { header: 'Country', key: 'country', width: 20 },
      { header: 'Website', key: 'website', width: 30 },
      { header: 'Students', key: 'studentPopulation', width: 20 },
    ];

    universities.forEach((uni) => {
      worksheet.addRow({
        rank: uni.rank || 'N/A',
        university: uni.university || 'N/A',
        country: uni.country || 'N/A',
        website: uni.website || 'N/A',
        studentPopulation: uni.studentPopulation || 'N/A',
      });
    });

    worksheet.getRow(1).eachCell((cell) => {
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFF97316' },
      };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' },
      };
    });

    try {
      await workbook.xlsx.writeFile(outputPath);
      this.logger.log(`Excel saved to: ${outputPath}`);
      return filename;
    } catch (error) {
      this.logger.error(`Error generating Excel: ${error.message}`);
      throw error;
    }
  }

  /**
   * Returns the full file system path for a given Excel filename.
   * @param filename The name of the Excel file (e.g., 'my_report.xlsx').
   * @returns The absolute path to the file.
   */
  getExcelFilePath(filename: string): string {
    const filePath = path.join(this.tempExcelDir, filename);
    this.logger.log(`Retrieving Excel file path: ${filePath}`);
    return filePath;
  }
}

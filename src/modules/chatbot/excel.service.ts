// src/modules/chatbot/excel/excel.service.ts
import { Injectable, Logger } from '@nestjs/common';
import * as ExcelJS from 'exceljs';
import * as path from 'path';
import * as fs from 'fs'; // Using fs directly as per your provided code
import { UniEntity } from '@UniversitiesModule/entities'; // Ensure this path and alias are correct

@Injectable()
export class ExcelService {
  private readonly logger = new Logger(ExcelService.name);

  constructor() {
    // Ensure temp_excels directory exists on service initialization
    const tempExcelDir = path.join(process.cwd(), 'temp_excels');
    if (!fs.existsSync(tempExcelDir)) {
      fs.mkdirSync(tempExcelDir, { recursive: true });
      this.logger.log(`Created directory: ${tempExcelDir}`);
    }
  }

  async generateTopUniversitiesExcel(universities: UniEntity[], country: string, limit: number): Promise<string> {
    const filename = `top_universities_${country.replace(/\s/g, '_')}_${limit}_${Date.now()}.xlsx`;
    const outputPath = path.join(process.cwd(), 'temp_excels', filename);

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(`Top ${limit} Universities in ${country}`);

    // --- CRITICAL CORRECTION HERE ---
    // Define columns for the worksheet, matching the keys to your UniEntity properties
    // and the headers to your desired Excel column names (consistent with PDF)
    worksheet.columns = [
      { header: 'Rank', key: 'rank', width: 10 }, // Directly using 'rank' from UniEntity
      { header: 'University', key: 'university', width: 40 }, // Corrected: UniEntity has 'university' property
      { header: 'Country', key: 'country', width: 20 },
      { header: 'Website', key: 'website', width: 30 },
      { header: 'Students', key: 'studentPopulation', width: 20 }, // Corrected: UniEntity has 'studentPopulation'
    ];

    // Add rows from university data
    universities.forEach((uni) => {
      worksheet.addRow({
        rank: uni.rank || 'N/A', // Access uni.rank
        university: uni.university || 'N/A', // Access uni.university
        country: uni.country || 'N/A',
        website: uni.website || 'N/A',
        studentPopulation: uni.studentPopulation || 'N/A', // Access uni.studentPopulation
      });
    });

    // Optional: Add some styling to the header row
    worksheet.getRow(1).eachCell((cell) => {
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } }; // White text
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFF97316' }, // Orange-500 equivalent color
      };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' },
      };
    });

    // Write to file
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
    const filePath = path.join(process.cwd(), 'temp_excels', filename);
    this.logger.log(`Retrieving Excel file path: ${filePath}`);
    return filePath;
  }
}

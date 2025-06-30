// src/modules/chatbot/file-export/file-export.service.ts
import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import * as ExcelJS from 'exceljs';
import * as PDFDocument from 'pdfkit';
import { UniEntity } from '@UniversitiesModule/entities'; // Make sure this path is correct based on your aliases

@Injectable()
export class FileExportService {
  private readonly _logger = new Logger(FileExportService.name);

  // Helper function to check if an academic field exists in the array
  private _hasAcademicField(uni: UniEntity, fieldName: string): string {
    return uni.academicFields && uni.academicFields.some((field) => field.name === fieldName) ? 'Yes' : 'No';
  }

  async generateExcel(data: UniEntity[]): Promise<string> {
    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Universities');

      worksheet.columns = [
        { header: 'Rank', key: 'rank', width: 10 },
        { header: 'University', key: 'university', width: 40 },
        { header: 'Country', key: 'country', width: 20 },
        { header: 'Location', key: 'location', width: 25 },
        { header: 'Type', key: 'type', width: 15 },
        { header: 'Student Population', key: 'studentPopulation', width: 20 },
        { header: 'Website', key: 'website', width: 30 },
        { header: 'Contact', key: 'contact', width: 25 },
        { header: 'Agricultural & Food Science', key: 'agriculturalFoodScience', width: 10 }, // Keep header for consistency
        { header: 'Arts & Design', key: 'artsDesign', width: 10 },
        { header: 'Economics & Business', key: 'economicsBusinessManagement', width: 10 },
        { header: 'Engineering', key: 'engineering', width: 10 },
        { header: 'Law & Political Science', key: 'lawPoliticalScience', width: 10 },
        { header: 'Medicine & Health Sciences', key: 'medicinePharmacyHealthSciences', width: 10 },
        { header: 'Physical Science', key: 'physicalScience', width: 10 },
        { header: 'Social Sciences & Humanities', key: 'socialSciencesHumanities', width: 10 },
        { header: 'Sports & Physical Education', key: 'sportsPhysicalEducation', width: 10 },
        { header: 'Technology', key: 'technology', width: 10 },
        { header: 'Theology', key: 'theology', width: 10 },
      ];

      data.forEach((uni) => {
        worksheet.addRow({
          rank: uni.rank,
          university: uni.university,
          country: uni.country,
          location: uni.location,
          type: uni.type,
          studentPopulation: uni.studentPopulation,
          website: uni.website,
          contact: uni.email || uni.contact,
          // Now dynamically check academicFields array
          agriculturalFoodScience: this._hasAcademicField(uni, 'Agricultural & Food Science'),
          artsDesign: this._hasAcademicField(uni, 'Arts & Design'),
          economicsBusinessManagement: this._hasAcademicField(uni, 'Economics & Business'), // Use the specific string
          engineering: this._hasAcademicField(uni, 'Engineering'),
          lawPoliticalScience: this._hasAcademicField(uni, 'Law & Political Science'),
          medicinePharmacyHealthSciences: this._hasAcademicField(uni, 'Medicine & Health Sciences'), // Use the specific string
          physicalScience: this._hasAcademicField(uni, 'Physical Science'),
          socialSciencesHumanities: this._hasAcademicField(uni, 'Social Sciences & Humanities'),
          sportsPhysicalEducation: this._hasAcademicField(uni, 'Sports & Physical Education'),
          technology: this._hasAcademicField(uni, 'Technology'),
          theology: this._hasAcademicField(uni, 'Theology'),
        });
      });

      const buffer = (await workbook.xlsx.writeBuffer()) as Buffer;
      return buffer.toString('base64');
    } catch (error) {
      this._logger.error(`Error generating Excel file: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Failed to generate Excel file.');
    }
  }

  async generatePdf(data: UniEntity[]): Promise<string> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 50 });

      const buffers: Buffer[] = [];
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => {
        const pdfBuffer = Buffer.concat(buffers);
        resolve(pdfBuffer.toString('base64'));
      });
      doc.on('error', (err) => {
        this._logger.error(`Error generating PDF: ${err.message}`, err.stack);
        reject(new InternalServerErrorException(`Failed to generate PDF: ${err.message}`));
      });
      const startX = doc.page.margins.left;
      let currentY = doc.page.margins.top;

      doc.fontSize(20).text('University Rankings Report', startX, currentY, {
        align: 'center',
        width: doc.page.width - 2 * startX,
      });
      currentY = doc.y + 20;

      const headers = ['University', 'Rank', 'Country', 'Location', 'Students', 'Type'];
      const columnWidths = [150, 40, 80, 100, 60, 60];
      const cellPadding = 5;
      const defaultRowHeight = 20;

      const drawRow = (rowCells: string[], y: number, isHeader = false, backgroundColor?: string) => {
        let x = startX;
        let maxHeight = defaultRowHeight;

        if (!isHeader) {
          doc.fontSize(9).font('Helvetica');
          rowCells.forEach((cellText, i) => {
            const textWidth = columnWidths[i] - 2 * cellPadding;
            const effectiveTextWidth = Math.max(1, textWidth);
            const textHeight = doc.heightOfString(cellText, { width: effectiveTextWidth });
            maxHeight = Math.max(maxHeight, textHeight + 2 * cellPadding);
          });
        } else {
          doc.fontSize(10).font('Helvetica-Bold');
          headers.forEach((headerText, i) => {
            const textWidth = columnWidths[i] - 2 * cellPadding;
            const effectiveTextWidth = Math.max(1, textWidth);
            const textHeight = doc.heightOfString(headerText, { width: effectiveTextWidth });
            maxHeight = Math.max(maxHeight, textHeight + 2 * cellPadding);
          });
        }

        if (backgroundColor) {
          doc
            .fillColor(backgroundColor)
            .rect(startX, y, doc.page.width - 2 * startX, maxHeight)
            .fill();
        }

        doc.lineWidth(0.5);
        doc.strokeColor('#000000');

        rowCells.forEach((cellText, i) => {
          const colWidth = columnWidths[i];

          doc.rect(x, y, colWidth, maxHeight).stroke();
          if (isHeader) {
            doc.fillColor('#333333').fontSize(10).font('Helvetica-Bold');
          } else {
            doc.fillColor('#000000').fontSize(9).font('Helvetica');
          }

          const textX = x + cellPadding;
          const textY = y + cellPadding;

          const textOptions: PDFKit.Mixins.TextOptions = {
            width: colWidth - 2 * cellPadding,
            align: 'left',
          };

          if (headers[i] === 'Students') {
            textOptions.align = 'right';
          }

          doc.text(cellText, textX, textY, textOptions);

          x += colWidth;
        });
        return maxHeight;
      };

      if (currentY + defaultRowHeight > doc.page.height - doc.page.margins.bottom) {
        doc.addPage();
        currentY = doc.page.margins.top;
      }

      const headerBg = '#eeeeee';
      const headerHeight = drawRow(headers, currentY, true, headerBg);
      currentY += headerHeight;

      data.forEach((uni, index) => {
        const rowData = [
          uni.university || 'N/A',
          uni.rank !== null && uni.rank !== undefined ? uni.rank.toString() : 'N/A',
          uni.country || 'N/A',
          uni.location || 'N/A',
          uni.studentPopulation ? uni.studentPopulation.toLocaleString() : 'N/A',
          uni.type || 'N/A',
        ];

        const rowBg = index % 2 === 0 ? '#ffffff' : '#f8f8f8';

        doc.fontSize(9).font('Helvetica');
        let estimatedRowHeight = defaultRowHeight;
        rowData.forEach((cellText, i) => {
          const textWidth = columnWidths[i] - 2 * cellPadding;
          const effectiveTextWidth = Math.max(1, textWidth);
          estimatedRowHeight = Math.max(
            estimatedRowHeight,
            doc.heightOfString(cellText, { width: effectiveTextWidth }) + 2 * cellPadding
          );
        });

        if (currentY + estimatedRowHeight > doc.page.height - doc.page.margins.bottom - estimatedRowHeight) {
          doc.addPage();
          currentY = doc.page.margins.top;
          drawRow(headers, currentY, true, headerBg);
          currentY += headerHeight;
        }

        const actualRowHeight = drawRow(rowData, currentY, false, rowBg);
        currentY += actualRowHeight;
      });

      const footerY = doc.page.height - 30;
      doc.fontSize(8).fillColor('#000000').text('Generated by UniScout', 50, footerY, { align: 'left' });
      doc.text(`Page ${doc.bufferedPageRange.length}`, doc.page.width - 100, footerY, { align: 'right' });
      doc.end();
    });
  }
}

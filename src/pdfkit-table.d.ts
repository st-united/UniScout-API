// src/pdfkit-table.d.ts

import 'pdfkit';
import { Options, Table } from 'pdfkit-table'; // Make sure pdfkit-table is installed

declare module 'pdfkit' {
  interface PDFDocument {
    /**
     * Adds a table to the PDF document.
     * @param table The table data and headers.
     * @param options Table formatting options.
     * @returns A Promise that resolves when the table has been added to the document.
     */
    table(table: Table, options?: Options): Promise<void>;
  }
}

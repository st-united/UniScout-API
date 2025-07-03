import { NestFactory } from '@nestjs/core';
import { AppModule } from '@app/app.module';
import { CsvImport } from './csv-import';

async function runImports() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const csvImportService = app.get(CsvImport);

  try {
    await csvImportService.importSubjectsCsv('./dataset/subjects.csv');
    await csvImportService.importUniCsv('./dataset/university.csv');
  } catch (error) {
    console.error('Import process failed:', error);
  } finally {
    await app.close();
  }
}

runImports().catch(console.error);

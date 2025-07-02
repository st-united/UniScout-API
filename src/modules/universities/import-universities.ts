import { NestFactory } from '@nestjs/core';
import { AppModule } from '@app/app.module';
import { CsvImport } from './csv-import';

async function runImports() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const csvImportService = app.get(CsvImport);

  try {
    console.log('\n Importing all academic fields, universities, and subjects...');

    console.log('\n Importing subjects from subjects.csv...');
    await csvImportService.importSubjectsCsv('./dataset/subjects.csv');

    console.log('\n Importing universities from university.csv...');
    await csvImportService.importUniCsv('./dataset/university.csv');

    console.log('\n All imports completed successfully!');
  } catch (error) {
    console.error('Import process failed:', error);
  } finally {
    await app.close();
  }
}

runImports().catch(console.error);

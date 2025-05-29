import { NestFactory } from '@nestjs/core';
import { AppModule } from '../../app.module';
import { CsvImport } from './csv-import';

async function importUniversities() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const csvImportService = app.get(CsvImport);

  try {
    console.log('\n Clearing all university and location data...');
    await csvImportService.clearAllData();

    console.log('\n Importing coordinates...');
    await csvImportService.importCoordinates('./dataset/coord.csv');

    console.log('\n Importing all universities from uni.csv...');
    await csvImportService.importCsv('./dataset/uni.csv');

    console.log('\n Final Statistics:');
    const stats = await csvImportService.getStats();
    console.table(stats);
  } catch (error) {
    console.error('Import process failed:', error);
  } finally {
    await app.close();
  }
}

importUniversities().catch(console.error);

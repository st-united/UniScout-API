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

    const imports = [
      { file: './dataset/aus.csv', country: 'aus' as const },
      { file: './dataset/ind.csv', country: 'ind' as const },
      { file: './dataset/jap.csv', country: 'jap' as const },
      { file: './dataset/kor.csv', country: 'kor' as const },
      { file: './dataset/usa.csv', country: 'usa' as const },
      { file: './dataset/vn.csv', country: 'vn' as const },
    ];

    for (const { file, country } of imports) {
      try {
        console.log(`\n Importing ${country.toUpperCase()} universities...`);
        await csvImportService.importCsv(file, country, false); // false = no need to clear again
      } catch (error) {
        console.error(`Failed to import ${country}:`, error.message);
      }
    }

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

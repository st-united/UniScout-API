import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import { EnablePgTrgmAndIndexOnUni1717391677000 } from './pg-trgm';
import { SearchIndex1749539773000 } from './search-index';
import { LinkUniversitiesToAcademicFields1710000000000 } from './link-field';

dotenv.config();

export default new DataSource({
  type: 'postgres',
  host: process.env.DB_POSTGRE_HOST,
  port: parseInt(process.env.DB_POSTGRE_PORT || '5432', 10),
  username: process.env.DB_POSTGRE_USERNAME,
  password: process.env.DB_POSTGRE_PASSWORD,
  database: process.env.DB_POSTGRE_DATABASE,
  synchronize: false,
  logging: process.env.DB_POSTGRE_LOGGING === 'true',
  migrations: [
    EnablePgTrgmAndIndexOnUni1717391677000,
    SearchIndex1749539773000,
    LinkUniversitiesToAcademicFields1710000000000,
  ],
});

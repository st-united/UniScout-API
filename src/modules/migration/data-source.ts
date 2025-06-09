import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import { UniEntity } from '@UniversitiesModule/entities/uni.entity';
import { CreateUniTable1717391676000 } from './uni-table';
import { EnablePgTrgmAndIndexOnUni1717391677000 } from './pg-trgm';
import { SearchIndex1749539773000 } from './search-index';

dotenv.config();

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_POSTGRE_HOST,
  port: parseInt(process.env.DB_POSTGRE_PORT || '5432', 10),
  username: process.env.DB_POSTGRE_USERNAME,
  password: process.env.DB_POSTGRE_PASSWORD,
  database: process.env.DB_POSTGRE_DATABASE,
  synchronize: false,
  logging: process.env.DB_POSTGRE_LOGGING === 'true',
  entities: [UniEntity],
  migrations: [CreateUniTable1717391676000, EnablePgTrgmAndIndexOnUni1717391677000, SearchIndex1749539773000],
});

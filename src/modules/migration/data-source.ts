import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import { UniEntity } from '@UniversitiesModule/entities';
import { CreateUniTable1717391676000 } from './uni-table';

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
  migrations: [CreateUniTable1717391676000],
});

import { MigrationInterface, QueryRunner } from 'typeorm';

export class EnablePgTrgmAndIndexOnUni1717391677000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE EXTENSION IF NOT EXISTS pg_trgm;
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_uni_university_trgm
      ON uni
      USING gin (university gin_trgm_ops);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_uni_university_trgm;
    `);
  }
}

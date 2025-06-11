import { MigrationInterface, QueryRunner } from 'typeorm';

export class SearchIndex1749539773000 implements MigrationInterface {
  name = 'SearchIndex1749539773000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_uni_combined_search_trgm
      ON uni
      USING gin (
          (COALESCE(university, '') || ' ' ||
           COALESCE(location, '')
           ) gin_trgm_ops
      );
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_uni_combined_search_trgm;
    `);
  }
}

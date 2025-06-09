import { MigrationInterface, QueryRunner } from 'typeorm';

export class SearchIndex1749539773000 implements MigrationInterface {
  name = 'SearchIndex1749539773000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_uni_combined_search_trgm
      ON uni
      USING gin (
          (COALESCE(university, '') || ' ' ||
           COALESCE(location, '') || ' ' ||
           CASE WHEN "agriculturalFoodScience" IS TRUE THEN 'agriculturalFoodScience' ELSE '' END || ' ' ||
           CASE WHEN "artsDesign" IS TRUE THEN 'artsDesign' ELSE '' END || ' ' ||
           CASE WHEN "economicsBusinessManagement" IS TRUE THEN 'economicsBusinessManagement' ELSE '' END || ' ' ||
           CASE WHEN "engineering" IS TRUE THEN 'engineering' ELSE '' END || ' ' ||
           CASE WHEN "lawPoliticalScience" IS TRUE THEN 'lawPoliticalScience' ELSE '' END || ' ' ||
           CASE WHEN "medicinePharmacyHealthSciences" IS TRUE THEN 'medicinePharmacyHealthSciences' ELSE '' END || ' ' ||
           CASE WHEN "physicalScience" IS TRUE THEN 'physicalScience' ELSE '' END || ' ' ||
           CASE WHEN "socialSciencesHumanities" IS TRUE THEN 'socialSciencesHumanities' ELSE '' END || ' ' ||
           CASE WHEN "sportsPhysicalEducation" IS TRUE THEN 'sportsPhysicalEducation' ELSE '' END || ' ' ||
           CASE WHEN "technology" IS TRUE THEN 'technology' ELSE '' END || ' ' ||
           CASE WHEN "theology" IS TRUE THEN 'theology' ELSE '' END
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

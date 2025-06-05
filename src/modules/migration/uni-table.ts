import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class CreateUniTable1717391676000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'uni',
        columns: [
          {
            name: 'id',
            type: 'int',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'university',
            type: 'text',
            isUnique: true,
            isNullable: false,
          },
          {
            name: 'latitude',
            type: 'double precision',
            isNullable: false,
          },
          {
            name: 'longitude',
            type: 'double precision',
            isNullable: false,
          },
          {
            name: 'logo',
            type: 'text',
            isNullable: false,
          },
          {
            name: 'rank',
            type: 'int',
            isNullable: true,
          },
          {
            name: 'type',
            type: 'text',
            isNullable: false,
          },
          {
            name: 'country',
            type: 'text',
            isNullable: false,
          },
          {
            name: 'location',
            type: 'text',
            isNullable: false,
          },
          {
            name: 'student',
            type: 'int',
            isNullable: false,
          },
          {
            name: 'year',
            type: 'int',
            isNullable: false,
          },
          {
            name: 'contact',
            type: 'text',
            isNullable: false,
          },
          {
            name: 'email',
            type: 'text',
            isNullable: false,
          },
          {
            name: 'website',
            type: 'text',
            isNullable: false,
          },
          {
            name: 'strength',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'description',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'exchange',
            type: 'boolean',
            isNullable: true,
          },
          {
            name: 'agricultural_food_science',
            type: 'boolean',
            isNullable: true,
          },
          {
            name: 'arts_design',
            type: 'boolean',
            isNullable: true,
          },
          {
            name: 'economics_business_management',
            type: 'boolean',
            isNullable: true,
          },
          {
            name: 'engineering',
            type: 'boolean',
            isNullable: true,
          },
          {
            name: 'law_political_science',
            type: 'boolean',
            isNullable: true,
          },
          {
            name: 'medicine_pharmacy_health_sciences',
            type: 'boolean',
            isNullable: true,
          },
          {
            name: 'physical_science',
            type: 'boolean',
            isNullable: true,
          },
          {
            name: 'social_sciences_humanities',
            type: 'boolean',
            isNullable: true,
          },
          {
            name: 'sports_physical_education',
            type: 'boolean',
            isNullable: true,
          },
          {
            name: 'technology',
            type: 'boolean',
            isNullable: true,
          },
          {
            name: 'theology',
            type: 'boolean',
            isNullable: true,
          },
          {
            name: 'is_deleted',
            type: 'boolean',
            default: false,
            isNullable: false,
          },

          {
            name: 'created_at',
            type: 'timestamp',
            precision: 6,
            default: 'CURRENT_TIMESTAMP(6)',
            isNullable: false,
          },
          {
            name: 'updated_at',
            type: 'timestamp',
            precision: 6,
            default: 'CURRENT_TIMESTAMP(6)',
            onUpdate: 'CURRENT_TIMESTAMP(6)',
            isNullable: false,
          },
        ],
      }),
      true
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('uni');
  }
}

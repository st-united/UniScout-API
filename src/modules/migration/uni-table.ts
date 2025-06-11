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
            name: 'studentPopulation',
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
            name: 'academicFields',
            type: 'jsonb',
            isNullable: true,
            default: `'[]'::jsonb`,
          },
          {
            name: 'isDeleted',
            type: 'boolean',
            default: false,
            isNullable: false,
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            precision: 6,
            default: 'CURRENT_TIMESTAMP(6)',
            isNullable: false,
          },
          {
            name: 'createdBy',
            type: 'bigint',
            isNullable: true,
          },
          {
            name: 'updatedAt',
            type: 'timestamp',
            precision: 6,
            default: 'CURRENT_TIMESTAMP(6)',
            onUpdate: 'CURRENT_TIMESTAMP(6)',
            isNullable: false,
          },
          {
            name: 'updatedBy',
            type: 'bigint',
            isNullable: true,
          },
          {
            name: 'deletedAt',
            type: 'timestamp',
            precision: 6,
            isNullable: true,
          },
          {
            name: 'deletedBy',
            type: 'bigint',
            isNullable: true,
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

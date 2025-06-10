import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class CreateSearchLogTable1749539773000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'search_log',
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
            isNullable: false,
          },
          {
            name: 'country',
            type: 'text',
            isNullable: false,
          },
          {
            name: 'searched_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            isNullable: false,
          },
        ],
      }),
      true
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('search_log');
  }
}

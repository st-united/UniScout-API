import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddAutoIncrementIdentityIdToUserTIMESTAMP implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'user',
      new TableColumn({
        name: 'identityId',
        type: 'int',
        isUnique: true,
        isNullable: true, // Set to false if you want it always required after this
        isGenerated: true,
        generationStrategy: 'increment',
      })
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('user', 'identityId');
  }
}

import { MigrationInterface, QueryRunner } from 'typeorm';

export class LinkUniversitiesToAcademicFields1710000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const universities: { id: number }[] = await queryRunner.query(`SELECT id FROM uni WHERE "isDeleted" = false`);

    const academicFields: { id: number }[] = await queryRunner.query(`SELECT id FROM academic_fields`);

    const values: string[] = [];
    universities.forEach((uni) => {
      academicFields.forEach((field) => {
        values.push(`(${uni.id}, ${field.id})`);
      });
    });

    if (values.length > 0) {
      const insertSql = `
        INSERT INTO university_academic_fields ("uniId", "academicFieldId")
        VALUES ${values.join(', ')}
        ON CONFLICT DO NOTHING
      `;
      await queryRunner.query(insertSql);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DELETE FROM university_academic_fields`);
  }
}

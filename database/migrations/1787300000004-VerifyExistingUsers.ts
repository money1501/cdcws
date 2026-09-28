import { MigrationInterface, QueryRunner } from 'typeorm';

export class VerifyExistingUsers1787300000004 implements MigrationInterface {
  name = 'VerifyExistingUsers1787300000004';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const result = await queryRunner.query(`
      UPDATE "user"
      SET "emailVerified" = true
      WHERE "emailVerified" = false
    `);
    console.log('[Migration] Successfully updated existing unverified users to emailVerified = true:', result);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Irreversible one-off data migration; no-op to preserve verified status of users
  }
}

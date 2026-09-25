import { MigrationInterface, QueryRunner } from "typeorm";

export class UserIsAdmin1787300000003 implements MigrationInterface {
  name = 'UserIsAdmin1787300000003';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "isAdmin" boolean NOT NULL DEFAULT false`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "user" DROP COLUMN IF EXISTS "isAdmin"`
    );
  }
}

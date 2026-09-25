import { MigrationInterface, QueryRunner } from "typeorm";

export class BoardAccessStatesAndWatermark1787300000001 implements MigrationInterface {
  name = 'BoardAccessStatesAndWatermark1787300000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TYPE "public"."boards_visibility_enum" ADD VALUE IF NOT EXISTS 'published'`
    );
    await queryRunner.query(
      `ALTER TABLE "boards" ADD COLUMN IF NOT EXISTS "anyone_can_edit" boolean NOT NULL DEFAULT false`
    );
    await queryRunner.query(
      `ALTER TABLE "boards" ADD COLUMN IF NOT EXISTS "original_owner_id" text`
    );
    await queryRunner.query(
      `ALTER TABLE "boards" ADD COLUMN IF NOT EXISTS "original_owner_name" character varying(255)`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "boards" DROP COLUMN IF EXISTS "original_owner_name"`
    );
    await queryRunner.query(
      `ALTER TABLE "boards" DROP COLUMN IF EXISTS "original_owner_id"`
    );
    await queryRunner.query(
      `ALTER TABLE "boards" DROP COLUMN IF EXISTS "anyone_can_edit"`
    );
  }
}

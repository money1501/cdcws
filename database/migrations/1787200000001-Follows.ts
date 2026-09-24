import { MigrationInterface, QueryRunner } from 'typeorm';

export class Follows1787200000001 implements MigrationInterface {
  name = 'Follows1787200000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "follows" (
        "follower_id"  text         NOT NULL,
        "following_id" text         NOT NULL,
        "created_at"   TIMESTAMPTZ  NOT NULL DEFAULT now(),
        CONSTRAINT "PK_follows" PRIMARY KEY ("follower_id", "following_id"),
        CONSTRAINT "FK_follows_follower"
          FOREIGN KEY ("follower_id") REFERENCES "user" ("id") ON DELETE CASCADE,
        CONSTRAINT "FK_follows_following"
          FOREIGN KEY ("following_id") REFERENCES "user" ("id") ON DELETE CASCADE
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "follows"`);
  }
}

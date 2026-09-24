import { MigrationInterface, QueryRunner } from 'typeorm';

export class UserProfiles1787200000000 implements MigrationInterface {
  name = 'UserProfiles1787200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "user_profiles" (
        "user_id"    text         NOT NULL,
        "username"   varchar(40)  UNIQUE,
        "bio"        text,
        "avatar_url" text,
        "created_at" TIMESTAMPTZ  NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ  NOT NULL DEFAULT now(),
        CONSTRAINT "PK_user_profiles" PRIMARY KEY ("user_id"),
        CONSTRAINT "FK_user_profiles_user"
          FOREIGN KEY ("user_id") REFERENCES "user" ("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_user_profiles_username" ON "user_profiles" ("username") WHERE "username" IS NOT NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "UQ_user_profiles_username"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "user_profiles"`);
  }
}

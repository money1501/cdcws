import { MigrationInterface, QueryRunner } from 'typeorm';

export class BoardCollaborators1787200000002 implements MigrationInterface {
  name = 'BoardCollaborators1787200000002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "board_collaborators" (
        "board_id"   uuid         NOT NULL,
        "user_id"    text         NOT NULL,
        "role"       varchar(20)  NOT NULL DEFAULT 'editor',
        "created_at" TIMESTAMPTZ  NOT NULL DEFAULT now(),
        CONSTRAINT "PK_board_collaborators" PRIMARY KEY ("board_id", "user_id"),
        CONSTRAINT "FK_board_collaborators_board"
          FOREIGN KEY ("board_id") REFERENCES "boards" ("id") ON DELETE CASCADE,
        CONSTRAINT "FK_board_collaborators_user"
          FOREIGN KEY ("user_id") REFERENCES "user" ("id") ON DELETE CASCADE
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "board_collaborators"`);
  }
}

import { MigrationInterface, QueryRunner } from 'typeorm';

export class CommunityIconUrl1787200000003 implements MigrationInterface {
  name = 'CommunityIconUrl1787200000003';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "communities" ADD COLUMN "icon_url" text`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "communities" DROP COLUMN "icon_url"`,
    );
  }
}

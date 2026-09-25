import { Column, Entity, PrimaryColumn } from 'typeorm';

/**
 * Read-only mapping onto better-auth's own `user` table (owned by the
 * BetterAuthSchema migration, not by TypeORM's diffing) — exists only so
 * other entities can join against name/email conveniently. Never written
 * to directly. Declares every real column with its exact real type (not
 * TypeORM's decorator defaults, which don't match — see BetterAuthSchema
 * migration) so a future `migration:generate` never sees a diff and
 * proposes altering columns better-auth actively manages.
 */
@Entity('user')
export class User {
  @PrimaryColumn({ type: 'text' })
  id!: string;

  @Column({ type: 'text' })
  name!: string;

  @Column({ type: 'text', unique: true })
  email!: string;

  @Column({ type: 'boolean' })
  emailVerified!: boolean;

  @Column({ type: 'text', nullable: true })
  image!: string | null;

  @Column({ type: 'boolean', default: false })
  isAdmin!: boolean;

  @Column({ type: 'timestamptz' })
  createdAt!: Date;

  @Column({ type: 'timestamptz' })
  updatedAt!: Date;
}

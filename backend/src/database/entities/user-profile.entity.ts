import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from './user.entity';

/**
 * Mutable user-facing profile data. The `user` table is owned by better-auth
 * and must not be altered; all profile extensions live here instead.
 */
@Entity('user_profiles')
export class UserProfile {
  /** Mirrors user.id (text PK, not uuid). */
  @PrimaryColumn({ type: 'text', name: 'user_id' })
  userId!: string;

  @OneToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({
    name: 'user_id',
    foreignKeyConstraintName: 'FK_user_profiles_user',
  })
  user?: User;

  /**
   * Chosen handle (e.g. @rishit). Unique across the platform.
   * If null the user has not set one yet; UI falls back to display name.
   */
  @Column({ type: 'varchar', length: 40, nullable: true, unique: true })
  username!: string | null;

  /** Public bio / "about me" text. */
  @Column({ type: 'text', nullable: true })
  bio!: string | null;

  /**
   * URL of the profile picture (can be a data-URL for MVP, or a CDN URL).
   * Nullable: no picture set yet.
   */
  @Column({ type: 'text', name: 'avatar_url', nullable: true })
  avatarUrl!: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}

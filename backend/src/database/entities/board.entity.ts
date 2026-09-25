import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  JoinTable,
  ManyToMany,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from './user.entity';
import { Community } from './community.entity';

export enum BoardVisibility {
  PRIVATE = 'private',
  PUBLIC = 'public',
  PUBLISHED = 'published',
}

@Entity('boards')
export class Board {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ type: 'text', name: 'owner_id' })
  ownerId!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'owner_id', foreignKeyConstraintName: 'FK_boards_owner' })
  owner?: User;

  @Column({ type: 'varchar', length: 255 })
  title!: string;

  @Index()
  @Column({ type: 'uuid', name: 'published_from_id', nullable: true })
  publishedFromId!: string | null;

  @Column({ type: 'varchar', length: 255, name: 'post_title', nullable: true })
  postTitle!: string | null;

  @Column({ type: 'text', name: 'post_details', nullable: true })
  postDetails!: string | null;

  @Column({ type: 'jsonb', name: 'post_tags', default: [] })
  postTags!: string[];

  @Column({ type: 'jsonb', name: 'post_media', default: [] })
  postMedia!: { name: string; type: string; url: string }[];

  @Column({
    type: 'enum',
    enum: BoardVisibility,
    default: BoardVisibility.PRIVATE,
  })
  visibility!: BoardVisibility;

  @Column({ type: 'boolean', name: 'anyone_can_edit', default: false })
  anyoneCanEdit!: boolean;

  @Column({ type: 'text', name: 'original_owner_id', nullable: true })
  originalOwnerId!: string | null;

  @Column({ type: 'varchar', length: 255, name: 'original_owner_name', nullable: true })
  originalOwnerName!: string | null;

  /** Community this board is posted to; null means it is unfiled. */
  @Index()
  @Column({ type: 'uuid', name: 'community_id', nullable: true })
  communityId!: string | null;

  @ManyToOne(() => Community, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({
    name: 'community_id',
    foreignKeyConstraintName: 'FK_boards_community',
  })
  community?: Community | null;

  @ManyToMany(() => Community)
  @JoinTable({
    name: 'board_communities',
    joinColumn: { name: 'board_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'community_id', referencedColumnName: 'id' },
  })
  communities?: Community[];

  @Column({ type: 'jsonb', default: {} })
  snapshot!: Record<string, unknown>;

  /** Small data-URL preview rendered client-side; `text` because data URLs
   *  routinely exceed varchar's default length. */
  @Column({ type: 'text', name: 'thumbnail_url', nullable: true })
  thumbnailUrl!: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}

import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from './user.entity';

@Entity('communities')
export class Community {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /** URL handle, shown as `d/<slug>`. Lowercase, unique, immutable. */
  @Index('UQ_communities_slug', { unique: true })
  @Column({ type: 'varchar', length: 64 })
  slug!: string;

  @Column({ type: 'varchar', length: 120 })
  name!: string;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  @Column({ type: 'text', name: 'icon_url', nullable: true })
  iconUrl!: string | null;

  @Index()
  @Column({ type: 'text', name: 'created_by' })
  createdBy!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({
    name: 'created_by',
    foreignKeyConstraintName: 'FK_communities_creator',
  })
  creator?: User;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}

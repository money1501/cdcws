import { CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { User } from './user.entity';

@Entity('follows')
export class Follow {
  @PrimaryColumn({ type: 'text', name: 'follower_id' })
  followerId!: string;

  @PrimaryColumn({ type: 'text', name: 'following_id' })
  followingId!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'follower_id' })
  follower?: User;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'following_id' })
  following?: User;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}

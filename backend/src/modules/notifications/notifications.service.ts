import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Follow } from '../../database/entities/follow.entity';
import { BoardCollaborator } from '../../database/entities/board-collaborator.entity';

export interface NotificationDto {
  id: string;
  type: 'follow' | 'collab_invite' | 'board_updated' | 'info';
  title: string;
  body: string;
  createdAt: string;
  read: boolean;
  link?: string;
}

@Injectable()
export class NotificationsService {
  /** In-memory set of read notification IDs per user: userId -> Set<notificationId> */
  private readonly readNotifs = new Map<string, Set<string>>();

  constructor(
    @InjectRepository(Follow)
    private readonly followsRepo: Repository<Follow>,
    @InjectRepository(BoardCollaborator)
    private readonly collabsRepo: Repository<BoardCollaborator>,
  ) {}

  async getUserNotifications(userId: string): Promise<NotificationDto[]> {
    const userReadSet = this.readNotifs.get(userId) ?? new Set<string>();

    // 1. Follows
    const follows = await this.followsRepo.find({
      where: { followingId: userId },
      relations: { follower: true },
      order: { createdAt: 'DESC' },
      take: 20,
    });

    const followNotifs: NotificationDto[] = follows.map((f) => {
      const id = `follow-${f.followerId}-${new Date(f.createdAt).getTime()}`;
      return {
        id,
        type: 'follow',
        title: `${f.follower?.name || 'Someone'} started following you`,
        body: 'Check out their profile and creations.',
        createdAt: new Date(f.createdAt).toISOString(),
        read: userReadSet.has(id),
        link: `/users/${f.followerId}`,
      };
    });

    // 2. Collab invites
    const collabs = await this.collabsRepo.find({
      where: { userId },
      relations: { board: true },
      order: { createdAt: 'DESC' },
      take: 20,
    });

    const collabNotifs: NotificationDto[] = collabs.map((c) => {
      const id = `collab-${c.boardId}-${new Date(c.createdAt).getTime()}`;
      return {
        id,
        type: 'collab_invite',
        title: `Invited to "${c.board?.title || 'Untitled board'}"`,
        body: `You were invited as an ${c.role} to collaborate.`,
        createdAt: new Date(c.createdAt).toISOString(),
        read: userReadSet.has(id),
        link: `/boards/${c.boardId}`,
      };
    });

    // Combine and sort by createdAt descending
    const all = [...followNotifs, ...collabNotifs];
    all.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return all;
  }

  markAsRead(userId: string, notifId: string): { success: boolean } {
    if (!this.readNotifs.has(userId)) {
      this.readNotifs.set(userId, new Set());
    }
    this.readNotifs.get(userId)!.add(notifId);
    return { success: true };
  }

  async markAllAsRead(userId: string): Promise<{ success: boolean }> {
    const notifs = await this.getUserNotifications(userId);
    if (!this.readNotifs.has(userId)) {
      this.readNotifs.set(userId, new Set());
    }
    const set = this.readNotifs.get(userId)!;
    for (const n of notifs) {
      set.add(n.id);
    }
    return { success: true };
  }
}

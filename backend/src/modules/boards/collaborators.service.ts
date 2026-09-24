import { Injectable, NotFoundException, ConflictException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { randomBytes } from 'crypto';
import { BoardCollaborator } from '../../database/entities/board-collaborator.entity';
import { Board } from '../../database/entities/board.entity';
import { UserProfile } from '../../database/entities/user-profile.entity';

@Injectable()
export class CollaboratorsService {
  /** In-memory token store: token -> { boardId, role, expiresAt } */
  private readonly inviteTokens = new Map<string, { boardId: string; role: 'editor' | 'viewer'; expiresAt: number }>();

  constructor(
    @InjectRepository(BoardCollaborator)
    private readonly collabsRepo: Repository<BoardCollaborator>,
    @InjectRepository(Board)
    private readonly boardsRepo: Repository<Board>,
    @InjectRepository(UserProfile)
    private readonly profilesRepo: Repository<UserProfile>,
  ) {}

  async inviteCollaborator(boardId: string, currentUserId: string, usernameToInvite: string, role: 'editor' | 'viewer') {
    const board = await this.boardsRepo.findOne({ where: { id: boardId } });
    if (!board) throw new NotFoundException('Board not found');
    if (board.ownerId !== currentUserId) throw new ConflictException('Only the owner can invite collaborators');

    const profile = await this.profilesRepo.findOne({ where: { username: usernameToInvite }, relations: { user: true } });
    if (!profile) throw new NotFoundException('User with that username not found');
    if (profile.userId === currentUserId) throw new ConflictException('You cannot invite yourself');

    const existing = await this.collabsRepo.findOne({ where: { boardId, userId: profile.userId } });
    if (existing) throw new ConflictException('User is already a collaborator');

    await this.collabsRepo.save(
      this.collabsRepo.create({ boardId, userId: profile.userId, role }),
    );
  }

  async removeCollaborator(boardId: string, currentUserId: string, userIdToRemove: string) {
    const board = await this.boardsRepo.findOne({ where: { id: boardId } });
    if (!board) throw new NotFoundException('Board not found');
    
    // Either the owner is removing someone, or the collaborator is leaving
    if (board.ownerId !== currentUserId && currentUserId !== userIdToRemove) {
      throw new ConflictException('Unauthorized to remove collaborator');
    }

    await this.collabsRepo.delete({ boardId, userId: userIdToRemove });
  }

  async getCollaborators(boardId: string): Promise<any[]> {
    const collabs = await this.collabsRepo.find({
      where: { boardId },
      relations: { user: true },
    });

    if (collabs.length === 0) return [];

    const userIds = collabs.map(c => c.userId);
    const profiles = await this.profilesRepo.createQueryBuilder('profile')
      .where('profile.user_id IN (:...ids)', { ids: userIds })
      .getMany();

    const profileMap = new Map(profiles.map(p => [p.userId, p]));

    return collabs.map(c => {
      const p = profileMap.get(c.userId);
      return {
        userId: c.userId,
        role: c.role,
        name: c.user?.name || 'Unknown',
        username: p?.username || null,
        avatarUrl: p?.avatarUrl || null,
      };
    });
  }

  async generateInviteLink(boardId: string, currentUserId: string, role: 'editor' | 'viewer' = 'editor') {
    const board = await this.boardsRepo.findOne({ where: { id: boardId } });
    if (!board) throw new NotFoundException('Board not found');
    if (board.ownerId !== currentUserId) throw new ForbiddenException('Only the owner can generate invite links');

    // Clean up expired tokens for this board
    for (const [token, val] of this.inviteTokens.entries()) {
      if (val.expiresAt < Date.now()) this.inviteTokens.delete(token);
    }

    const token = randomBytes(24).toString('hex');
    const expiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000; // 7 days
    this.inviteTokens.set(token, { boardId, role, expiresAt });
    return { token };
  }

  async joinViaToken(token: string, userId: string) {
    // Prune all expired tokens on every redemption attempt
    for (const [t, val] of this.inviteTokens.entries()) {
      if (val.expiresAt < Date.now()) this.inviteTokens.delete(t);
    }

    const entry = this.inviteTokens.get(token);
    if (!entry) throw new NotFoundException('Invite link is invalid or has expired');
    if (entry.expiresAt < Date.now()) {
      this.inviteTokens.delete(token);
      throw new NotFoundException('Invite link has expired');
    }

    const { boardId, role } = entry;
    const board = await this.boardsRepo.findOne({ where: { id: boardId } });
    if (!board) throw new NotFoundException('Board not found');
    if (board.ownerId === userId) return { boardId, alreadyOwner: true };

    const existing = await this.collabsRepo.findOne({ where: { boardId, userId } });
    if (!existing) {
      await this.collabsRepo.save(this.collabsRepo.create({ boardId, userId, role }));
    }
    return { boardId };
  }
}

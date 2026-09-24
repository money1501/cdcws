import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserProfile } from '../../database/entities/user-profile.entity';
import { User } from '../../database/entities/user.entity';
import { Follow } from '../../database/entities/follow.entity';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(UserProfile)
    private readonly profilesRepo: Repository<UserProfile>,
    @InjectRepository(User)
    private readonly usersRepo: Repository<User>,
    @InjectRepository(Follow)
    private readonly followsRepo: Repository<Follow>,
  ) {}

  /**
   * Returns the profile for a given userId, creating a blank one if none
   * exists yet (lazy-initialisation so we don't need to seed on signup).
   */
  async getOrCreateProfile(userId: string): Promise<UserProfile> {
    let profile = await this.profilesRepo.findOne({ where: { userId } });
    if (!profile) {
      profile = this.profilesRepo.create({ userId, username: null, bio: null, avatarUrl: null });
      await this.profilesRepo.save(profile);
    }
    return profile;
  }

  async getProfileByUserId(userId: string): Promise<UserProfile> {
    const profile = await this.profilesRepo.findOne({ where: { userId } });
    if (!profile) {
      // If no profile exists return an empty shell (no 404 — caller may just
      // want to render a default state).
      return this.profilesRepo.create({
        userId,
        username: null,
        bio: null,
        avatarUrl: null,
      });
    }
    return profile;
  }

  async getPublicProfileByUserId(
    userId: string,
    currentUserId?: string,
  ) {
    const user = await this.usersRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    const profile = await this.getProfileByUserId(userId);
    
    const followersCount = await this.followsRepo.count({ where: { followingId: userId } });
    const followingCount = await this.followsRepo.count({ where: { followerId: userId } });
    
    let isFollowedByMe: boolean | null = null;
    if (currentUserId && currentUserId !== userId) {
      const follow = await this.followsRepo.findOne({ where: { followerId: currentUserId, followingId: userId } });
      isFollowedByMe = !!follow;
    }

    return { 
      ...profile, 
      name: user.name, 
      email: user.email,
      followersCount,
      followingCount,
      isFollowedByMe,
    };
  }

  async updateProfile(
    userId: string,
    dto: UpdateProfileDto,
  ): Promise<UserProfile> {
    // Check username uniqueness if it's changing
    if (dto.username !== undefined && dto.username !== null) {
      const clash = await this.profilesRepo.findOne({
        where: { username: dto.username },
      });
      if (clash && clash.userId !== userId) {
        throw new ConflictException(
          `Username "@${dto.username}" is already taken.`,
        );
      }
    }

    let profile = await this.profilesRepo.findOne({ where: { userId } });
    if (!profile) {
      profile = this.profilesRepo.create({ userId });
    }

    if (dto.username !== undefined) profile.username = dto.username || null;
    if (dto.bio !== undefined) profile.bio = dto.bio || null;
    if (dto.avatarUrl !== undefined) profile.avatarUrl = dto.avatarUrl || null;

    return this.profilesRepo.save(profile);
  }

  async followUser(followerId: string, followingId: string): Promise<void> {
    if (followerId === followingId) throw new ConflictException('Cannot follow yourself');
    
    const target = await this.usersRepo.findOne({ where: { id: followingId } });
    if (!target) throw new NotFoundException('User not found');

    const existing = await this.followsRepo.findOne({ where: { followerId, followingId } });
    if (!existing) {
      await this.followsRepo.save(this.followsRepo.create({ followerId, followingId }));
    }
  }

  async unfollowUser(followerId: string, followingId: string): Promise<void> {
    await this.followsRepo.delete({ followerId, followingId });
  }

  async getFollowing(userId: string) {
    const follows = await this.followsRepo.find({
      where: { followerId: userId },
      relations: { following: true },
    });
    
    const followingIds = follows.map(f => f.followingId);
    if (followingIds.length === 0) return [];

    const profiles = await this.profilesRepo.createQueryBuilder('profile')
      .where('profile.user_id IN (:...ids)', { ids: followingIds })
      .getMany();

    const profileMap = new Map(profiles.map(p => [p.userId, p]));

    return follows.map(f => {
      const profile = profileMap.get(f.followingId);
      return {
        userId: f.followingId,
        name: f.following?.name || 'Unknown',
        username: profile?.username || null,
        avatarUrl: profile?.avatarUrl || null,
      };
    });
  }

  async getFollowers(userId: string) {
    const follows = await this.followsRepo.find({
      where: { followingId: userId },
      relations: { follower: true },
    });
    
    const followerIds = follows.map(f => f.followerId);
    if (followerIds.length === 0) return [];

    const profiles = await this.profilesRepo.createQueryBuilder('profile')
      .where('profile.user_id IN (:...ids)', { ids: followerIds })
      .getMany();

    const profileMap = new Map(profiles.map(p => [p.userId, p]));

    return follows.map(f => {
      const profile = profileMap.get(f.followerId);
      return {
        userId: f.followerId,
        name: f.follower?.name || 'Unknown',
        username: profile?.username || null,
        avatarUrl: profile?.avatarUrl || null,
      };
    });
  }

  /**
   * Full-text search across user display name and username.
   * Returns lightweight summaries suitable for explore-page results.
   * Uses a single JOIN query instead of multiple round trips.
   */
  async searchUsers(query: string, limit = 20) {
    const term = `%${query}%`;

    // Single query: join user table with user_profiles on user.id = profile.user_id
    // User entity has no back-relation to UserProfile, so we join by table name.
    const rows = await this.usersRepo
      .createQueryBuilder('u')
      .leftJoin('user_profiles', 'p', 'p.user_id = u.id')
      .select([
        'u.id AS "userId"',
        'u.name AS "name"',
        'p.username AS "username"',
        'p.avatar_url AS "avatarUrl"',
        'p.bio AS "bio"',
      ])
      .where('u.name ILIKE :term OR p.username ILIKE :term', { term })
      .limit(limit)
      .getRawMany<{
        userId: string;
        name: string;
        username: string | null;
        avatarUrl: string | null;
        bio: string | null;
      }>();

    return rows;
  }
}

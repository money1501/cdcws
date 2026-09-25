import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, In, Repository } from 'typeorm';
import { Board, BoardVisibility } from '../../database/entities/board.entity';
import { BoardCommunity } from '../../database/entities/board-community.entity';
import { Community } from '../../database/entities/community.entity';
import {
  CommunityMember,
  CommunityRole,
} from '../../database/entities/community-member.entity';
import { CommunityService, type FeedItem } from './community.service';
import { CreateCommunityDto } from './dto/create-community.dto';
import { UpdateCommunityDto } from './dto/update-community.dto';

export interface CommunitySummary {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  iconUrl: string | null;
  memberCount: number;
  boardCount: number;
  joined: boolean;
  role: CommunityRole | null;
  createdAt: Date;
}

/** Reserved because they collide with existing or planned routes. */
const RESERVED_SLUGS = new Set([
  'new',
  'all',
  'popular',
  'create',
  'search',
  'admin',
  'settings',
  'boards',
  'community',
  'communities',
]);

const SLUG_PATTERN = /^[a-z0-9](?:[a-z0-9_-]{1,30}[a-z0-9])$/;

@Injectable()
export class CommunitiesService {
  constructor(
    @InjectRepository(Community)
    private readonly communitiesRepository: Repository<Community>,
    @InjectRepository(CommunityMember)
    private readonly membersRepository: Repository<CommunityMember>,
    @InjectRepository(Board)
    private readonly boardsRepository: Repository<Board>,
    @InjectRepository(BoardCommunity)
    private readonly boardCommunitiesRepository: Repository<BoardCommunity>,
    private readonly communityService: CommunityService,
  ) {}

  async list(
    currentUserId: string,
    query?: string,
  ): Promise<CommunitySummary[]> {
    const term = query?.trim();
    const where = term
      ? [
          { name: ILike(`%${term}%`) },
          { slug: ILike(`%${term}%`) },
          { description: ILike(`%${term}%`) },
        ]
      : {};

    const communities = await this.communitiesRepository.find({
      where,
      order: { createdAt: 'DESC' },
      take: 100,
    });
    return this.summarise(communities, currentUserId);
  }

  /** Communities the user has joined, for their own navigation. */
  async listMine(currentUserId: string): Promise<CommunitySummary[]> {
    const memberships = await this.membersRepository.find({
      where: { userId: currentUserId },
    });
    if (memberships.length === 0) return [];

    const communities = await this.communitiesRepository.find({
      where: { id: In(memberships.map((m) => m.communityId)) },
    });
    return this.summarise(communities, currentUserId);
  }

  async getBySlug(
    slug: string,
    currentUserId: string,
  ): Promise<CommunitySummary> {
    const community = await this.findBySlugOrFail(slug);
    const [summary] = await this.summarise([community], currentUserId);
    return summary;
  }

  async create(
    currentUserId: string,
    dto: CreateCommunityDto,
  ): Promise<CommunitySummary> {
    const slug = dto.slug.trim().toLowerCase();

    if (!SLUG_PATTERN.test(slug)) {
      throw new BadRequestException(
        'Handle must be 3-32 characters: lowercase letters, numbers, hyphens or underscores, starting and ending alphanumeric.',
      );
    }
    if (RESERVED_SLUGS.has(slug)) {
      throw new BadRequestException(`d/${slug} is reserved.`);
    }
    if (await this.communitiesRepository.existsBy({ slug })) {
      throw new ConflictException(`d/${slug} already exists.`);
    }

    const community = await this.communitiesRepository.save(
      this.communitiesRepository.create({
        slug,
        name: dto.name.trim(),
        description: dto.description?.trim() || null,
        iconUrl: dto.iconUrl || null,
        createdBy: currentUserId,
      }),
    );

    // The creator owns and belongs to what they made.
    await this.membersRepository.save(
      this.membersRepository.create({
        communityId: community.id,
        userId: currentUserId,
        role: CommunityRole.OWNER,
      }),
    );

    const [summary] = await this.summarise([community], currentUserId);
    return summary;
  }

  async update(
    slug: string,
    currentUserId: string,
    dto: UpdateCommunityDto,
    isAdmin = false,
  ): Promise<CommunitySummary> {
    const community = await this.findBySlugOrFail(slug);
    const membership = await this.membersRepository.findOneBy({
      communityId: community.id,
      userId: currentUserId,
    });

    if (!isAdmin && membership?.role !== CommunityRole.OWNER && community.createdBy !== currentUserId) {
      throw new ForbiddenException('Only the community owner or an admin can edit community details.');
    }

    if (dto.name !== undefined) {
      const name = dto.name.trim();
      if (!name) throw new BadRequestException('Community name cannot be blank.');
      community.name = name;
    }

    if (dto.description !== undefined) {
      community.description = dto.description?.trim() || null;
    }

    if (dto.iconUrl !== undefined) {
      community.iconUrl = dto.iconUrl || null;
    }

    await this.communitiesRepository.save(community);
    const [summary] = await this.summarise([community], currentUserId);
    return summary;
  }

  async join(slug: string, currentUserId: string): Promise<CommunitySummary> {
    const community = await this.findBySlugOrFail(slug);
    const existing = await this.membersRepository.findOneBy({
      communityId: community.id,
      userId: currentUserId,
    });
    if (!existing) {
      await this.membersRepository.save(
        this.membersRepository.create({
          communityId: community.id,
          userId: currentUserId,
          role: CommunityRole.MEMBER,
        }),
      );
    }
    const [summary] = await this.summarise([community], currentUserId);
    return summary;
  }

  async leave(slug: string, currentUserId: string): Promise<CommunitySummary> {
    const community = await this.findBySlugOrFail(slug);
    const membership = await this.membersRepository.findOneBy({
      communityId: community.id,
      userId: currentUserId,
    });

    if (membership?.role === CommunityRole.OWNER) {
      throw new ForbiddenException(
        'Owners cannot leave their own community. Transfer ownership or delete it instead.',
      );
    }
    if (membership) {
      await this.membersRepository.remove(membership);
    }

    const [summary] = await this.summarise([community], currentUserId);
    return summary;
  }

  async remove(slug: string, currentUserId: string, isAdmin = false): Promise<void> {
    const community = await this.findBySlugOrFail(slug);
    const membership = await this.membersRepository.findOneBy({
      communityId: community.id,
      userId: currentUserId,
    });

    if (!isAdmin && membership?.role !== CommunityRole.OWNER && community.createdBy !== currentUserId) {
      throw new ForbiddenException('Only the community owner or an admin can delete it.');
    }

    await this.communitiesRepository.remove(community);
  }

  /** Public boards posted to this community, newest first. */
  async listBoards(slug: string, currentUserId: string): Promise<FeedItem[]> {
    const community = await this.findBySlugOrFail(slug);
    const boards = await this.boardsRepository
      .createQueryBuilder('board')
      .leftJoin('board_communities', 'boardCommunity', 'boardCommunity.board_id = board.id')
      .leftJoinAndSelect('board.owner', 'owner')
      .where('board.visibility IN (:...visibilities)', {
        visibilities: [BoardVisibility.PUBLIC, BoardVisibility.PUBLISHED],
      })
      .andWhere(
        '(board.community_id = :communityId OR boardCommunity.community_id = :communityId)',
        { communityId: community.id },
      )
      .orderBy('board.updated_at', 'DESC')
      .getMany();
    return this.communityService.enrichBoards(boards, currentUserId);
  }

  /**
   * Files a board under a community. Only the board owner may do this, and
   * only into a community they belong to.
   */
  async setBoardCommunity(
    boardId: string,
    ownerId: string,
    slug: string | null,
  ): Promise<Board> {
    const board = await this.boardsRepository.findOneBy({
      id: boardId,
      ownerId,
    });
    if (!board) {
      throw new NotFoundException(`Board ${boardId} not found`);
    }

    if (slug === null) {
      board.communityId = null;
      return this.boardsRepository.save(board);
    }

    const community = await this.findBySlugOrFail(slug);
    const membership = await this.membersRepository.findOneBy({
      communityId: community.id,
      userId: ownerId,
    });
    if (!membership) {
      throw new ForbiddenException(
        `Join d/${community.slug} before posting to it.`,
      );
    }

    board.communityId = community.id;
    return this.boardsRepository.save(board);
  }

  async setBoardCommunities(
    boardId: string,
    ownerId: string,
    slugs: string[],
  ): Promise<Board> {
    const board = await this.boardsRepository.findOneBy({ id: boardId, ownerId });
    if (!board) {
      throw new NotFoundException(`Board ${boardId} not found`);
    }

    const uniqueSlugs = [...new Set(slugs.map((slug) => slug.trim().toLowerCase()))];
    const communities = await Promise.all(
      uniqueSlugs.map((slug) => this.findBySlugOrFail(slug)),
    );
    for (const community of communities) {
      const membership = await this.membersRepository.findOneBy({
        communityId: community.id,
        userId: ownerId,
      });
      if (!membership) {
        throw new ForbiddenException(
          `Join d/${community.slug} before posting to it.`,
        );
      }
    }

    board.communityId = communities[0]?.id ?? null;
    board.communities = communities;
    return this.boardsRepository.save(board);
  }

  private async findBySlugOrFail(slug: string): Promise<Community> {
    const community = await this.communitiesRepository.findOneBy({
      slug: slug.toLowerCase(),
    });
    if (!community) {
      throw new NotFoundException(`Community d/${slug} not found`);
    }
    return community;
  }

  private async summarise(
    communities: Community[],
    currentUserId: string,
  ): Promise<CommunitySummary[]> {
    if (communities.length === 0) return [];
    const ids = communities.map((c) => c.id);

    const [memberRows, boardRows, myMemberships] = await Promise.all([
      this.membersRepository
        .createQueryBuilder('m')
        .select('m.community_id', 'communityId')
        .addSelect('COUNT(*)', 'count')
        .where('m.community_id IN (:...ids)', { ids })
        .groupBy('m.community_id')
        .getRawMany<{ communityId: string; count: string }>(),
      this.boardsRepository.query(
        `SELECT "communityId", COUNT(DISTINCT "boardId")::int AS count
         FROM (
           SELECT b.id AS "boardId", b.community_id AS "communityId"
           FROM boards b
           WHERE b.community_id = ANY($1) AND b.visibility IN ($2, $3)
           UNION ALL
           SELECT bc.board_id AS "boardId", bc.community_id AS "communityId"
           FROM board_communities bc
           JOIN boards b ON b.id = bc.board_id
           WHERE bc.community_id = ANY($1) AND b.visibility IN ($2, $3)
         ) posted
         GROUP BY "communityId"`,
        [ids, BoardVisibility.PUBLIC, BoardVisibility.PUBLISHED],
      ) as Promise<{ communityId: string; count: string }[]>,
      this.membersRepository.find({
        where: { communityId: In(ids), userId: currentUserId },
      }),
    ]);

    const memberCounts = new Map(
      memberRows.map((r) => [r.communityId, Number(r.count)]),
    );
    const boardCounts = new Map(
      boardRows.map((r) => [r.communityId, Number(r.count)]),
    );
    const roles = new Map(myMemberships.map((m) => [m.communityId, m.role]));

    return communities
      .map((c) => ({
        id: c.id,
        slug: c.slug,
        name: c.name,
        description: c.description,
        iconUrl: c.iconUrl ?? null,
        memberCount: memberCounts.get(c.id) ?? 0,
        boardCount: boardCounts.get(c.id) ?? 0,
        joined: roles.has(c.id),
        role: roles.get(c.id) ?? null,
        createdAt: c.createdAt,
      }))
      .sort((a, b) => b.memberCount - a.memberCount);
  }
}

import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Board, BoardVisibility } from '../../database/entities/board.entity';
import { VotesService } from './votes.service';
import { CommentsService } from './comments.service';
import { BookmarksService } from './bookmarks.service';

export interface FeedItem {
  id: string;
  title: string;
  boardTitle: string;
  postTitle: string | null;
  postDetails: string | null;
  postTags: string[];
  postMedia: { name: string; type: string; url: string }[];
  ownerId: string;
  ownerName: string;
  thumbnailUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
  score: number;
  myVote: number | null;
  commentCount: number;
  bookmarked: boolean;
}

// Single-board detail view only — the feed list deliberately omits the
// (potentially large) snapshot blob for every board it lists.
export interface FeedItemDetail extends FeedItem {
  snapshot: Record<string, unknown>;
}

@Injectable()
export class CommunityService {
  constructor(
    @InjectRepository(Board)
    private readonly boardsRepository: Repository<Board>,
    private readonly votesService: VotesService,
    private readonly commentsService: CommentsService,
    private readonly bookmarksService: BookmarksService,
  ) {}

  async listFeed(currentUserId: string, query?: string): Promise<FeedItem[]> {
    const term = query?.trim();
    const boards = await this.boardsRepository
      .createQueryBuilder('board')
      .leftJoinAndSelect('board.owner', 'owner')
      .where('board.visibility IN (:...visibilities)', {
        visibilities: [BoardVisibility.PUBLIC, BoardVisibility.PUBLISHED],
      })
      .andWhere(
        term
          ? '(board.title ILIKE :term OR board.post_title ILIKE :term OR board.post_details ILIKE :term)'
          : '1 = 1',
        term ? { term: `%${term}%` } : {},
      )
      .orderBy('board.updated_at', 'DESC')
      .getMany();
    return this.enrichBoards(boards, currentUserId);
  }

  /** Boards the user has bookmarked, newest-updated first. */
  async listSaved(currentUserId: string): Promise<FeedItem[]> {
    const savedIds =
      await this.bookmarksService.listMineWithBoardIds(currentUserId);
    if (savedIds.size === 0) return [];

    const boards = await this.boardsRepository.find({
      where: [
        { id: In([...savedIds]), visibility: BoardVisibility.PUBLIC },
        { id: In([...savedIds]), visibility: BoardVisibility.PUBLISHED },
      ],
      relations: { owner: true },
      order: { updatedAt: 'DESC' },
    });
    return this.enrichBoards(boards, currentUserId);
  }

  async getPublicBoard(id: string): Promise<Board> {
    const board = await this.boardsRepository.findOne({
      where: [
        { id, visibility: BoardVisibility.PUBLIC },
        { id, visibility: BoardVisibility.PUBLISHED },
      ],
      relations: { owner: true },
    });
    if (!board) {
      throw new NotFoundException(`Public board ${id} not found`);
    }
    return board;
  }

  async getPublicBoardWithStats(
    id: string,
    currentUserId: string,
  ): Promise<FeedItemDetail> {
    const board = await this.getPublicBoard(id);
    const [enriched] = await this.enrichBoards([board], currentUserId);
    return { ...enriched, snapshot: board.snapshot };
  }

  async duplicateBoard(id: string, currentUserId: string): Promise<Board> {
    // Readable via ownership OR public/published visibility
    const board = await this.boardsRepository.findOne({
      where: { id },
      relations: { owner: true },
    });
    if (
      !board ||
      (board.visibility !== BoardVisibility.PUBLIC &&
        board.visibility !== BoardVisibility.PUBLISHED &&
        board.ownerId !== currentUserId)
    ) {
      throw new NotFoundException(`Board ${id} not found`);
    }

    const isDifferentOwner = board.ownerId !== currentUserId;
    const originalOwnerId = isDifferentOwner
      ? (board.originalOwnerId || board.ownerId)
      : null;
    const originalOwnerName = isDifferentOwner
      ? (board.originalOwnerName || board.owner?.name || 'original creator')
      : null;

    const copy = this.boardsRepository.create({
      ownerId: currentUserId,
      title: `${board.title} (copy)`,
      visibility: BoardVisibility.PRIVATE,
      anyoneCanEdit: false,
      originalOwnerId,
      originalOwnerName,
      snapshot: board.snapshot,
      thumbnailUrl: board.thumbnailUrl,
    });
    return this.boardsRepository.save(copy);
  }

  /** Public so community-scoped feeds share one definition of feed shape. */
  async enrichBoards(
    boards: Board[],
    currentUserId: string,
  ): Promise<FeedItem[]> {
    const boardIds = boards.map((b) => b.id);
    const [scores, commentCounts, bookmarked] = await Promise.all([
      this.votesService.getScoresForBoards(boardIds, currentUserId),
      this.commentsService.countsForBoards(boardIds),
      this.bookmarksService.isBookmarkedByMany(boardIds, currentUserId),
    ]);

    return boards.map((board) => ({
      id: board.id,
      title: board.postTitle || board.title,
      boardTitle: board.title,
      postTitle: board.postTitle,
      postDetails: board.postDetails,
      postTags: board.postTags ?? [],
      postMedia: board.postMedia ?? [],
      ownerId: board.ownerId,
      ownerName: board.owner?.name ?? 'Unknown',
      thumbnailUrl: board.thumbnailUrl,
      visibility: board.visibility,
      anyoneCanEdit: board.anyoneCanEdit,
      originalOwnerId: board.originalOwnerId,
      originalOwnerName: board.originalOwnerName,
      createdAt: board.createdAt,
      updatedAt: board.updatedAt,
      score: scores.get(board.id)?.score ?? 0,
      myVote: scores.get(board.id)?.myVote ?? null,
      commentCount: commentCounts.get(board.id) ?? 0,
      bookmarked: bookmarked.has(board.id),
    }));
  }
}

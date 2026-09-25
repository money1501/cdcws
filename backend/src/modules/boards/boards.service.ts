import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { Board, BoardVisibility } from '../../database/entities/board.entity';
import { BoardCollaborator } from '../../database/entities/board-collaborator.entity';
import { CreateBoardDto } from './dto/create-board.dto';
import { UpdateBoardSnapshotDto } from './dto/update-board-snapshot.dto';
import { UpdateBoardVisibilityDto } from './dto/update-board-visibility.dto';
import { RenameBoardDto } from './dto/rename-board.dto';
import { PublishBoardDto } from './dto/publish-board.dto';

export interface EnrichedBoard extends Board {
  role?: 'owner' | 'editor' | 'viewer';
  canEdit?: boolean;
}

@Injectable()
export class BoardsService {
  constructor(
    @InjectRepository(Board)
    private readonly boardsRepository: Repository<Board>,
    @InjectRepository(BoardCollaborator)
    private readonly collabsRepository: Repository<BoardCollaborator>,
  ) {}

  async listByOwner(ownerId: string): Promise<Board[]> {
    return this.boardsRepository.find({
      where: { ownerId, publishedFromId: IsNull() },
      order: { updatedAt: 'DESC' },
    });
  }

  async listSharedWith(userId: string): Promise<Board[]> {
    const collabs = await this.collabsRepository.find({
      where: { userId },
      relations: { board: { owner: true } },
    });
    return collabs.map((c) => c.board!).filter((b) => !!b);
  }

  async findOneOwnedBy(id: string, ownerId: string): Promise<Board> {
    const board = await this.boardsRepository.findOne({
      where: { id, ownerId },
      relations: { owner: true },
    });
    if (!board) {
      throw new NotFoundException(`Board ${id} not found`);
    }
    return board;
  }

  async findOneAccessibleBy(id: string, userId?: string | null): Promise<EnrichedBoard> {
    const board = await this.boardsRepository.findOne({
      where: { id },
      relations: { owner: true, communities: true },
    });
    if (!board) throw new NotFoundException(`Board ${id} not found`);

    if (board.visibility === BoardVisibility.PUBLISHED) {
      // Published boards are permanently read-only for everyone
      return {
        ...board,
        role: 'viewer',
        canEdit: false,
      };
    }

    if (userId && board.ownerId === userId) {
      return {
        ...board,
        role: 'owner',
        canEdit: true,
      };
    }

    if (board.visibility === BoardVisibility.PUBLIC) {
      if (board.anyoneCanEdit) {
        return {
          ...board,
          role: 'editor',
          canEdit: true,
        };
      }
      if (userId) {
        const collab = await this.collabsRepository.findOne({
          where: { boardId: id, userId },
        });
        const role = collab?.role ?? 'viewer';
        return {
          ...board,
          role,
          canEdit: role === 'editor',
        };
      }
      return {
        ...board,
        role: 'viewer',
        canEdit: false,
      };
    }

    // Private board: must be owner or collaborator
    if (!userId) {
      throw new NotFoundException(`Board ${id} not found`);
    }

    const collab = await this.collabsRepository.findOne({
      where: { boardId: id, userId },
    });
    if (!collab) {
      throw new NotFoundException(`Board ${id} not found`);
    }

    return {
      ...board,
      role: collab.role,
      canEdit: collab.role === 'editor',
    };
  }

  async create(ownerId: string, dto: CreateBoardDto): Promise<Board> {
    const board = this.boardsRepository.create({
      ownerId,
      title: dto.title,
      visibility: BoardVisibility.PRIVATE,
      anyoneCanEdit: false,
      snapshot: dto.snapshot || {},
      thumbnailUrl: dto.thumbnail || null,
    });
    return this.boardsRepository.save(board);
  }

  async updateSnapshot(
    id: string,
    userId: string | null | undefined,
    dto: UpdateBoardSnapshotDto,
  ): Promise<Board> {
    const board = await this.boardsRepository.findOne({ where: { id } });
    if (!board) throw new NotFoundException(`Board ${id} not found`);

    if (board.visibility === BoardVisibility.PUBLISHED) {
      throw new ForbiddenException(
        'Published boards are read-only and cannot be edited. Duplicate the board to make changes.',
      );
    }

    if (!userId || board.ownerId !== userId) {
      if (board.visibility === BoardVisibility.PUBLIC && board.anyoneCanEdit) {
        // Allowed by "anyone can edit" mode
      } else if (userId) {
        const collab = await this.collabsRepository.findOne({
          where: { boardId: id, userId, role: 'editor' },
        });
        if (!collab) {
          throw new ForbiddenException('You do not have permission to edit this board.');
        }
      } else {
        throw new ForbiddenException('You do not have permission to edit this board.');
      }
    }

    board.snapshot = dto.snapshot;
    if (dto.thumbnail !== undefined) {
      board.thumbnailUrl = dto.thumbnail || null;
    }
    return this.boardsRepository.save(board);
  }

  async rename(
    id: string,
    ownerId: string,
    dto: RenameBoardDto,
  ): Promise<Board> {
    const board = await this.findOneOwnedBy(id, ownerId);
    if (board.visibility === BoardVisibility.PUBLISHED) {
      throw new ForbiddenException('Published boards cannot be renamed.');
    }
    const title = dto.title.trim();
    if (!title) {
      throw new BadRequestException('Title cannot be blank.');
    }
    board.title = title;
    return this.boardsRepository.save(board);
  }

  async updateVisibility(
    id: string,
    ownerId: string,
    dto: UpdateBoardVisibilityDto,
  ): Promise<Board> {
    const board = await this.findOneOwnedBy(id, ownerId);
    if (board.visibility === BoardVisibility.PUBLISHED && dto.visibility !== BoardVisibility.PUBLISHED) {
      throw new ForbiddenException(
        'Published status is irreversible. Duplicate the board to create an editable copy.',
      );
    }

    if (dto.visibility === BoardVisibility.PRIVATE) {
      await this.boardsRepository.delete({
        publishedFromId: board.id,
        ownerId,
      });
    }

    board.visibility = dto.visibility;
    if (dto.anyoneCanEdit !== undefined) {
      board.anyoneCanEdit = dto.anyoneCanEdit;
    }
    return this.boardsRepository.save(board);
  }

  async publish(
    id: string,
    ownerId: string,
    dto: PublishBoardDto,
  ): Promise<Board> {
    const board = await this.findOneOwnedBy(id, ownerId);
    if (board.visibility === BoardVisibility.PUBLISHED) {
      throw new BadRequestException('Board is already published.');
    }

    const postTitle = dto.postTitle.trim();
    if (!postTitle) {
      throw new BadRequestException('Post title cannot be blank.');
    }

    board.visibility = BoardVisibility.PUBLISHED;
    board.postTitle = postTitle;
    board.postDetails = dto.postDetails.trim() || null;
    board.postTags = dto.postTags.map((tag) => tag.trim().toLowerCase()).filter(Boolean);
    board.postMedia = dto.postMedia;
    return this.boardsRepository.save(board);
  }

  async remove(id: string, ownerId: string): Promise<void> {
    const board = await this.findOneOwnedBy(id, ownerId);
    await this.boardsRepository.remove(board);
  }
}

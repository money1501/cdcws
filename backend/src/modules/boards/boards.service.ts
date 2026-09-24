import {
  BadRequestException,
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
      relations: { board: true },
    });
    return collabs.map(c => c.board!).filter(b => !!b);
  }

  async findOneOwnedBy(id: string, ownerId: string): Promise<Board> {
    const board = await this.boardsRepository.findOne({
      where: { id, ownerId },
    });
    if (!board) {
      throw new NotFoundException(`Board ${id} not found`);
    }
    return board;
  }

  async findOneAccessibleBy(id: string, userId: string): Promise<Board> {
    const board = await this.boardsRepository.findOne({ where: { id } });
    if (!board) throw new NotFoundException(`Board ${id} not found`);

    if (board.ownerId !== userId) {
      const collab = await this.collabsRepository.findOne({
        where: { boardId: id, userId },
      });
      if (!collab) throw new NotFoundException(`Board ${id} not found`);
    }

    return board;
  }

  async create(ownerId: string, dto: CreateBoardDto): Promise<Board> {
    const board = this.boardsRepository.create({
      ownerId,
      title: dto.title,
      snapshot: {},
    });
    return this.boardsRepository.save(board);
  }

  async updateSnapshot(
    id: string,
    userId: string,
    dto: UpdateBoardSnapshotDto,
  ): Promise<Board> {
    const board = await this.boardsRepository.findOne({ where: { id } });
    if (!board) throw new NotFoundException(`Board ${id} not found`);

    if (board.ownerId !== userId) {
      const collab = await this.collabsRepository.findOne({
        where: { boardId: id, userId, role: 'editor' },
      });
      if (!collab) {
        throw new NotFoundException(`Board ${id} not found`);
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
    if (dto.visibility === 'private') {
      await this.boardsRepository.delete({
        publishedFromId: board.id,
        ownerId,
      });
    }
    board.visibility = dto.visibility;
    return this.boardsRepository.save(board);
  }

  async publish(
    id: string,
    ownerId: string,
    dto: PublishBoardDto,
  ): Promise<Board> {
    const board = await this.findOneOwnedBy(id, ownerId);
    const postTitle = dto.postTitle.trim();
    if (!postTitle) {
      throw new BadRequestException('Post title cannot be blank.');
    }

    return this.boardsRepository.save(
      this.boardsRepository.create({
        ownerId,
        title: board.title,
        publishedFromId: board.id,
        visibility: BoardVisibility.PUBLIC,
        snapshot: board.snapshot,
        thumbnailUrl: board.thumbnailUrl,
        postTitle,
        postDetails: dto.postDetails.trim() || null,
        postTags: dto.postTags.map((tag) => tag.trim().toLowerCase()).filter(Boolean),
        postMedia: dto.postMedia,
      }),
    );
  }

  async remove(id: string, ownerId: string): Promise<void> {
    const board = await this.findOneOwnedBy(id, ownerId);
    await this.boardsRepository.remove(board);
  }
}

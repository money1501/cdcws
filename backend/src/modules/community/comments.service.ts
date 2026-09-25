import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Comment } from '../../database/entities/comment.entity';
import { CreateCommentDto } from './dto/create-comment.dto';

@Injectable()
export class CommentsService {
  constructor(
    @InjectRepository(Comment)
    private readonly commentsRepository: Repository<Comment>,
  ) {}

  async listForBoard(boardId: string): Promise<Comment[]> {
    return this.commentsRepository.find({
      where: { boardId },
      relations: { user: true },
      order: { createdAt: 'ASC' },
    });
  }

  async create(
    boardId: string,
    userId: string,
    dto: CreateCommentDto,
  ): Promise<Comment> {
    const comment = this.commentsRepository.create({
      boardId,
      userId,
      body: dto.body,
      parentCommentId: dto.parentCommentId ?? null,
    });
    const saved = await this.commentsRepository.save(comment);
    return this.commentsRepository.findOneOrFail({
      where: { id: saved.id },
      relations: { user: true },
    });
  }

  async countsForBoards(boardIds: string[]): Promise<Map<string, number>> {
    const counts = new Map<string, number>();
    if (boardIds.length === 0) return counts;

    const rows: Array<{ boardId: string; count: string }> =
      await this.commentsRepository
        .createQueryBuilder('comment')
        .select('comment.board_id', 'boardId')
        .addSelect('COUNT(*)', 'count')
        .where('comment.boardId IN (:...boardIds)', { boardIds })
        .groupBy('comment.board_id')
        .getRawMany();

    for (const row of rows) {
      counts.set(row.boardId, Number(row.count));
    }
    return counts;
  }

  async remove(
    commentId: string,
    userId: string,
    isAdmin = false,
  ): Promise<void> {
    const comment = await this.commentsRepository.findOne({
      where: { id: commentId },
    });
    if (!comment) {
      return;
    }
    if (comment.userId !== userId && !isAdmin) {
      throw new ForbiddenException(
        'Only the author or an admin can delete this comment',
      );
    }
    await this.commentsRepository.remove(comment);
  }

  async update(
    commentId: string,
    userId: string,
    body: string,
    isAdmin = false,
  ): Promise<Comment> {
    const comment = await this.commentsRepository.findOne({
      where: { id: commentId },
      relations: { user: true },
    });
    if (!comment) {
      throw new NotFoundException(`Comment ${commentId} not found`);
    }
    if (comment.userId !== userId && !isAdmin) {
      throw new ForbiddenException(
        'Only the author or an admin can edit this comment',
      );
    }
    comment.body = body;
    return this.commentsRepository.save(comment);
  }
}

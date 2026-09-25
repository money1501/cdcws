import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { AllowAnonymous, Session, type UserSession } from '@thallesp/nestjs-better-auth';
import { CommentsService } from './comments.service';
import { CreateCommentDto } from './dto/create-comment.dto';

@Controller('community/boards/:id/comments')
export class CommentsController {
  constructor(private readonly commentsService: CommentsService) {}

  @AllowAnonymous()
  @Get()
  list(@Param('id') boardId: string) {
    return this.commentsService.listForBoard(boardId);
  }

  @Post()
  create(
    @Param('id') boardId: string,
    @Body() dto: CreateCommentDto,
    @Session() session: UserSession,
  ) {
    return this.commentsService.create(boardId, session.user.id, dto);
  }

  @Patch(':commentId')
  update(
    @Param('commentId') commentId: string,
    @Body() dto: CreateCommentDto,
    @Session() session: UserSession,
  ) {
    return this.commentsService.update(
      commentId,
      session.user.id,
      dto.body,
      Boolean((session.user as any)?.isAdmin),
    );
  }

  @Delete(':commentId')
  remove(
    @Param('commentId') commentId: string,
    @Session() session: UserSession,
  ) {
    return this.commentsService.remove(
      commentId,
      session.user.id,
      Boolean((session.user as any)?.isAdmin),
    );
  }
}

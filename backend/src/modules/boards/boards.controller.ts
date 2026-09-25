import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { AllowAnonymous, Session, type UserSession } from '@thallesp/nestjs-better-auth';
import { BoardsService } from './boards.service';
import { CreateBoardDto } from './dto/create-board.dto';
import { UpdateBoardSnapshotDto } from './dto/update-board-snapshot.dto';
import { UpdateBoardVisibilityDto } from './dto/update-board-visibility.dto';
import { RenameBoardDto } from './dto/rename-board.dto';
import { PublishBoardDto } from './dto/publish-board.dto';

@Controller('boards')
export class BoardsController {
  constructor(private readonly boardsService: BoardsService) { }

  @Get()
  list(@Session() session: UserSession) {
    return this.boardsService.listByOwner(session.user.id);
  }

  @Get('shared')
  listShared(@Session() session: UserSession) {
    return this.boardsService.listSharedWith(session.user.id);
  }

  @AllowAnonymous()
  @Get(':id')
  findOne(@Param('id') id: string, @Session() session?: UserSession) {
    const isAdmin = Boolean((session?.user as any)?.isAdmin);
    return this.boardsService.findOneAccessibleBy(id, session?.user?.id ?? null, isAdmin);
  }

  @Post()
  create(@Body() dto: CreateBoardDto, @Session() session: UserSession) {
    return this.boardsService.create(session.user.id, dto);
  }

  @Post(':id/duplicate')
  duplicate(@Param('id') id: string, @Session() session: UserSession) {
    return this.boardsService.duplicate(id, session.user.id);
  }

  @AllowAnonymous()

  @Patch(':id/snapshot')
  updateSnapshot(
    @Param('id') id: string,
    @Body() dto: UpdateBoardSnapshotDto,
    @Session() session?: UserSession,
  ) {
    const isAdmin = Boolean((session?.user as any)?.isAdmin);
    return this.boardsService.updateSnapshot(id, session?.user?.id ?? null, dto, isAdmin);
  }

  @Patch(':id/title')
  rename(
    @Param('id') id: string,
    @Body() dto: RenameBoardDto,
    @Session() session: UserSession,
  ) {
    const isAdmin = Boolean((session.user as any)?.isAdmin);
    return this.boardsService.rename(id, session.user.id, dto, isAdmin);
  }

  @Patch(':id/visibility')
  updateVisibility(
    @Param('id') id: string,
    @Body() dto: UpdateBoardVisibilityDto,
    @Session() session: UserSession,
  ) {
    const isAdmin = Boolean((session.user as any)?.isAdmin);
    return this.boardsService.updateVisibility(id, session.user.id, dto, isAdmin);
  }

  @Post(':id/publish')
  publish(
    @Param('id') id: string,
    @Body() dto: PublishBoardDto,
    @Session() session: UserSession,
  ) {
    const isAdmin = Boolean((session.user as any)?.isAdmin);
    return this.boardsService.publish(id, session.user.id, dto, isAdmin);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Session() session: UserSession) {
    const isAdmin = Boolean((session.user as any)?.isAdmin);
    return this.boardsService.remove(id, session.user.id, isAdmin);
  }
}

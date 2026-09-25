import { Controller, Get, Param, Post, Query } from '@nestjs/common';
import { AllowAnonymous, Session, type UserSession } from '@thallesp/nestjs-better-auth';
import { CommunityService } from './community.service';

@Controller('community/boards')
export class CommunityController {
  constructor(private readonly communityService: CommunityService) {}

  @AllowAnonymous()
  @Get()
  listFeed(@Session() session?: UserSession, @Query('q') q?: string) {
    return this.communityService.listFeed(session?.user?.id ?? '', q);
  }

  @Get('saved')
  listSaved(@Session() session: UserSession) {
    return this.communityService.listSaved(session.user.id);
  }

  @AllowAnonymous()
  @Get('user/:userId')
  listByUser(
    @Param('userId') userId: string,
    @Session() session?: UserSession,
  ) {
    return this.communityService.listByUser(userId, session?.user?.id ?? '');
  }

  @AllowAnonymous()
  @Get(':id')
  getBoard(@Param('id') id: string, @Session() session?: UserSession) {
    return this.communityService.getPublicBoardWithStats(id, session?.user?.id ?? '');
  }

  @Post(':id/duplicate')
  duplicate(@Param('id') id: string, @Session() session: UserSession) {
    return this.communityService.duplicateBoard(id, session.user.id);
  }
}

import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { AllowAnonymous, Session, type UserSession } from '@thallesp/nestjs-better-auth';
import { CommunitiesService } from './communities.service';
import { CreateCommunityDto } from './dto/create-community.dto';
import {
  SetBoardCommunitiesDto,
  SetBoardCommunityDto,
} from './dto/set-board-community.dto';

@Controller('communities')
export class CommunitiesController {
  constructor(private readonly communitiesService: CommunitiesService) {}

  @AllowAnonymous()
  @Get()
  list(@Session() session?: UserSession, @Query('q') q?: string) {
    return this.communitiesService.list(session?.user?.id ?? '', q);
  }

  @Get('mine')
  listMine(@Session() session: UserSession) {
    return this.communitiesService.listMine(session.user.id);
  }

  @Post()
  create(@Session() session: UserSession, @Body() dto: CreateCommunityDto) {
    return this.communitiesService.create(session.user.id, dto);
  }

  @AllowAnonymous()
  @Get(':slug')
  get(@Param('slug') slug: string, @Session() session?: UserSession) {
    return this.communitiesService.getBySlug(slug, session?.user?.id ?? '');
  }

  @AllowAnonymous()
  @Get(':slug/boards')
  listBoards(@Param('slug') slug: string, @Session() session?: UserSession) {
    return this.communitiesService.listBoards(slug, session?.user?.id ?? '');
  }

  @Put(':slug/membership')
  join(@Param('slug') slug: string, @Session() session: UserSession) {
    return this.communitiesService.join(slug, session.user.id);
  }

  @Delete(':slug/membership')
  leave(@Param('slug') slug: string, @Session() session: UserSession) {
    return this.communitiesService.leave(slug, session.user.id);
  }

  @Delete(':slug')
  remove(@Param('slug') slug: string, @Session() session: UserSession) {
    return this.communitiesService.remove(slug, session.user.id);
  }
}

@Controller('boards')
export class BoardCommunityController {
  constructor(private readonly communitiesService: CommunitiesService) {}

  @Put(':id/community')
  setCommunity(
    @Param('id') id: string,
    @Session() session: UserSession,
    @Body() dto: SetBoardCommunityDto,
  ) {
    return this.communitiesService.setBoardCommunity(
      id,
      session.user.id,
      dto.slug ?? null,
    );
  }

  @Put(':id/communities')
  setCommunities(
    @Param('id') id: string,
    @Session() session: UserSession,
    @Body() dto: SetBoardCommunitiesDto,
  ) {
    return this.communitiesService.setBoardCommunities(
      id,
      session.user.id,
      dto.slugs ?? [],
    );
  }
}

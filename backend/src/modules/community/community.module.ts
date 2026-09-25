import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Board } from '../../database/entities/board.entity';
import { BoardCollaborator } from '../../database/entities/board-collaborator.entity';
import { BoardCommunity } from '../../database/entities/board-community.entity';
import { Vote } from '../../database/entities/vote.entity';
import { Comment } from '../../database/entities/comment.entity';
import { Bookmark } from '../../database/entities/bookmark.entity';
import { Community } from '../../database/entities/community.entity';
import { CommunityMember } from '../../database/entities/community-member.entity';
import { CommunityController } from './community.controller';
import { CommunityService } from './community.service';
import {
  BoardCommunityController,
  CommunitiesController,
} from './communities.controller';
import { CommunitiesService } from './communities.service';
import { VotesController } from './votes.controller';
import { VotesService } from './votes.service';
import { CommentsController } from './comments.controller';
import { CommentsService } from './comments.service';
import { BookmarksController } from './bookmarks.controller';
import { BookmarksService } from './bookmarks.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Board,
      BoardCollaborator,
      BoardCommunity,
      Vote,
      Comment,
      Bookmark,
      Community,
      CommunityMember,
    ]),
  ],
  controllers: [
    CommunityController,
    CommunitiesController,
    BoardCommunityController,
    VotesController,
    CommentsController,
    BookmarksController,
  ],
  providers: [
    CommunityService,
    CommunitiesService,
    VotesService,
    CommentsService,
    BookmarksService,
  ],
})
export class CommunityModule {}

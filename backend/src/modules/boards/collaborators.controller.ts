import { Body, Controller, Delete, Get, Param, Post } from '@nestjs/common';
import { Session, type UserSession } from '@thallesp/nestjs-better-auth';
import { CollaboratorsService } from './collaborators.service';

@Controller('boards')
export class CollaboratorsController {
  constructor(private readonly collabsService: CollaboratorsService) {}

  @Post(':boardId/collaborators')
  inviteCollaborator(
    @Param('boardId') boardId: string,
    @Body('username') username: string,
    @Body('role') role: 'editor' | 'viewer',
    @Session() session: UserSession,
  ) {
    return this.collabsService.inviteCollaborator(boardId, session.user.id, username, role || 'editor');
  }

  @Delete(':boardId/collaborators/:userId')
  removeCollaborator(
    @Param('boardId') boardId: string,
    @Param('userId') userId: string,
    @Session() session: UserSession,
  ) {
    return this.collabsService.removeCollaborator(boardId, session.user.id, userId);
  }

  @Get(':boardId/collaborators')
  getCollaborators(@Param('boardId') boardId: string) {
    return this.collabsService.getCollaborators(boardId);
  }

  @Post(':boardId/collaborators/invite-link')
  generateInviteLink(
    @Param('boardId') boardId: string,
    @Body('role') role: 'editor' | 'viewer',
    @Session() session: UserSession,
  ) {
    return this.collabsService.generateInviteLink(boardId, session.user.id, role || 'editor');
  }

  @Post('join/:token')
  joinViaToken(
    @Param('token') token: string,
    @Session() session: UserSession,
  ) {
    return this.collabsService.joinViaToken(token, session.user.id);
  }
}

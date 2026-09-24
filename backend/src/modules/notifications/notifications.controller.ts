import { Controller, Get, Param, Patch } from '@nestjs/common';
import { Session, type UserSession } from '@thallesp/nestjs-better-auth';
import { NotificationsService } from './notifications.service';

@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notifsService: NotificationsService) {}

  @Get()
  getNotifications(@Session() session: UserSession) {
    return this.notifsService.getUserNotifications(session.user.id);
  }

  @Patch('read-all')
  markAllRead(@Session() session: UserSession) {
    return this.notifsService.markAllAsRead(session.user.id);
  }

  @Patch(':id/read')
  markRead(@Param('id') id: string, @Session() session: UserSession) {
    return this.notifsService.markAsRead(session.user.id, id);
  }
}

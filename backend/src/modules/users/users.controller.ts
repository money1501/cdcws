import { Body, Controller, Delete, Get, Param, Patch, Put, Query } from '@nestjs/common';
import { Session, type UserSession } from '@thallesp/nestjs-better-auth';
import { UsersService } from './users.service';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  /** Search users by display name or username */
  @Get('search')
  searchUsers(@Query('q') q: string) {
    if (!q || !q.trim()) return [];
    return this.usersService.searchUsers(q.trim());
  }

  /** Own profile — read */
  @Get('me/profile')
  getMyProfile(@Session() session: UserSession) {
    return this.usersService.getOrCreateProfile(session.user.id);
  }

  /** Own profile — update */
  @Patch('me/profile')
  updateMyProfile(
    @Body() dto: UpdateProfileDto,
    @Session() session: UserSession,
  ) {
    return this.usersService.updateProfile(session.user.id, dto);
  }

  /** Another user's public profile */
  @Get(':userId/profile')
  getPublicProfile(
    @Param('userId') userId: string,
    @Session() session: UserSession,
  ) {
    return this.usersService.getPublicProfileByUserId(userId, session.user.id);
  }

  @Put(':userId/follow')
  followUser(@Param('userId') userId: string, @Session() session: UserSession) {
    return this.usersService.followUser(session.user.id, userId);
  }

  @Delete(':userId/follow')
  unfollowUser(@Param('userId') userId: string, @Session() session: UserSession) {
    return this.usersService.unfollowUser(session.user.id, userId);
  }

  @Get(':userId/following')
  getFollowing(@Param('userId') userId: string) {
    return this.usersService.getFollowing(userId);
  }

  @Get(':userId/followers')
  getFollowers(@Param('userId') userId: string) {
    return this.usersService.getFollowers(userId);
  }
}

import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';

@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user || request.session?.user;
    if (user?.isAdmin) {
      return true;
    }
    throw new ForbiddenException('Admin access required');
  }
}

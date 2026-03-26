import { Injectable, CanActivate, ExecutionContext, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class AdminGuard extends AuthGuard('jwt') implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    // First check if the JWT is valid (401 if token missing/invalid)
    const result = await super.canActivate(context);
    if (!result) {
      return false;
    }

    // Then check if the user is an admin (403 if authenticated but wrong role)
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user || !user.role || user.role !== 'admin') {
      throw new ForbiddenException('Access denied. Admin privileges required.');
    }

    return true;
  }
}
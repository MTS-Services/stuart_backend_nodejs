import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class AdminGuard extends AuthGuard('jwt') implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    // First check if the JWT is valid
    const result = await super.canActivate(context);
    if (!result) {
      return false;
    }

    // Then check if the user is an admin
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // Check if user exists and has admin role
    if (!user || !user.role || user.role !== 'admin') {
      throw new UnauthorizedException('Access denied. Admin privileges required.');
    }

    return true;
  }
}
import { 
  Controller, 
  Get, 
  UseGuards, 
  Request 
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { UserService } from './user.service';

@Controller('user')
export class UserController {
  constructor(private userService: UserService) {}

  /**
   * GET /user/profile
   * Decodes JWT token from Authorization header and returns user details with profile
   * @param req - Request object containing authenticated user from JWT
   * @returns User object with profile details
   */
  @Get('profile')
  @UseGuards(AuthGuard('jwt'))
  async getUserProfile(@Request() req) {
    return this.userService.getUserProfile(req.user.id);
  }
}

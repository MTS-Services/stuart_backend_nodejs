import { 
  Controller, 
  Get, 
  Post, 
  Put, 
  Body, 
  Param, 
  Query,
  UseGuards, 
  Request,
  ParseIntPipe 
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AdminService } from './admin.service';

@Controller('admin')
@UseGuards(AuthGuard('jwt'))
export class AdminController {
  constructor(private adminService: AdminService) {}

  @Get('dashboard')
  async getDashboard() {
    return this.adminService.getDashboardStats();
  }

  @Get('profiles/pending')
  async getPendingProfiles(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10
  ) {
    return this.adminService.getPendingProfiles(page, limit);
  }

  @Get('profiles/:profileId')
  async getProfile(@Param('profileId', ParseIntPipe) profileId: number) {
    return this.adminService.getProfileById(profileId);
  }

  @Post('profiles/:profileId/approve')
  async approveProfile(
    @Request() req,
    @Param('profileId', ParseIntPipe) profileId: number
  ) {
    return this.adminService.approveProfile(req.user.id, profileId);
  }

  @Post('profiles/:profileId/reject')
  async rejectProfile(
    @Request() req,
    @Param('profileId', ParseIntPipe) profileId: number,
    @Body('reason') reason: string
  ) {
    return this.adminService.rejectProfile(req.user.id, profileId, reason);
  }

  @Get('profiles/verified')
  async getVerifiedProfiles(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10
  ) {
    return this.adminService.getVerifiedProfiles(page, limit);
  }

  @Post('profiles/:profileId/unverify')
  async unverifyProfile(
    @Request() req,
    @Param('profileId', ParseIntPipe) profileId: number,
    @Body('reason') reason: string
  ) {
    return this.adminService.unverifyProfile(req.user.id, profileId, reason);
  }

  @Get('notifications')
  async getNotifications(
    @Request() req,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20
  ) {
    return this.adminService.getNotifications(req.user.id, page, limit);
  }

  @Put('notifications/:notificationId/read')
  async markNotificationAsRead(
    @Request() req,
    @Param('notificationId', ParseIntPipe) notificationId: number
  ) {
    return this.adminService.markNotificationAsRead(req.user.id, notificationId);
  }
}
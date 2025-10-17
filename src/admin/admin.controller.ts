import { 
  Controller, 
  Get, 
  Post, 
  Put, 
  Delete,
  Body, 
  Param, 
  Query,
  UseGuards, 
  Request,
  ParseIntPipe,
  BadRequestException
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

  @Get('test-verified')
  async testVerified() {
    // Simple test endpoint without validation to check data
    return this.adminService.getVerifiedProfiles(1, 10);
  }

  @Get('profiles/pending')
  async getPendingProfiles(
    @Query('page') page?: string,
    @Query('limit') limit?: string
  ) {
    const pageNum = page ? Math.max(1, parseInt(page, 10) || 1) : 1;
    const limitNum = limit ? Math.max(1, Math.min(100, parseInt(limit, 10) || 10)) : 10;
    return this.adminService.getPendingProfiles(pageNum, limitNum);
  }

  @Get('profiles/:profileId')
  async getProfile(@Param('profileId', ParseIntPipe) profileId: number) {
    return this.adminService.getProfileById(profileId);
  }

  @Post('profiles/approve')
  async approveProfile(
    @Request() req,
    @Query('profile_id') profileId: string
  ) {
    const profileIdNum = parseInt(profileId, 10);
    if (!profileIdNum || isNaN(profileIdNum)) {
      throw new BadRequestException('Invalid profile_id provided');
    }
    return this.adminService.approveProfile(req.user.id, profileIdNum);
  }

  @Post('profiles/reject')
  async rejectProfile(
    @Request() req,
    @Query('profile_id') profileId: string,
    @Body('reason') reason: string
  ) {
    const profileIdNum = parseInt(profileId, 10);
    if (!profileIdNum || isNaN(profileIdNum)) {
      throw new BadRequestException('Invalid profile_id provided');
    }
    return this.adminService.rejectProfile(req.user.id, profileIdNum, reason);
  }

  @Get('profiles/verified')
  async getVerifiedProfiles(
    @Query('page') page?: string,
    @Query('limit') limit?: string
  ) {
    const pageNum = page ? Math.max(1, parseInt(page, 10) || 1) : 1;
    const limitNum = limit ? Math.max(1, Math.min(100, parseInt(limit, 10) || 10)) : 10;
    return this.adminService.getVerifiedProfiles(pageNum, limitNum);
  }

  @Post('profiles/unverify')
  async unverifyProfile(
    @Request() req,
    @Query('profile_id') profileId: string,
    @Body('reason') reason: string
  ) {
    const profileIdNum = parseInt(profileId, 10);
    if (!profileIdNum || isNaN(profileIdNum)) {
      throw new BadRequestException('Invalid profile_id provided');
    }
    return this.adminService.unverifyProfile(req.user.id, profileIdNum, reason);
  }

  @Get('notifications')
  async getNotifications(
    @Request() req,
    @Query('page') page?: string,
    @Query('limit') limit?: string
  ) {
    const pageNum = page ? Math.max(1, parseInt(page, 10) || 1) : 1;
    const limitNum = limit ? Math.max(1, Math.min(100, parseInt(limit, 10) || 20)) : 20;
    return this.adminService.getNotifications(req.user.id, pageNum, limitNum);
  }

  @Put('notifications/:notificationId/read')
  async markNotificationAsRead(
    @Request() req,
    @Param('notificationId', ParseIntPipe) notificationId: number
  ) {
    return this.adminService.markNotificationAsRead(req.user.id, notificationId);
  }

  // Get unread notifications count for badge
  @Get('notifications/unread-count')
  async getUnreadNotificationsCount(@Request() req) {
    return this.adminService.getUnreadNotificationsCount(req.user.id);
  }

  // Mark all notifications as read
  @Put('notifications/mark-all-read')
  async markAllNotificationsAsRead(@Request() req) {
    return this.adminService.markAllNotificationsAsRead(req.user.id);
  }

  // Get recent notifications (last 24 hours)
  @Get('notifications/recent')
  async getRecentNotifications(@Request() req) {
    return this.adminService.getRecentNotifications(req.user.id);
  }

  // Delete a notification
  @Delete('notifications/:notificationId')
  async deleteNotification(
    @Request() req,
    @Param('notificationId', ParseIntPipe) notificationId: number
  ) {
    return this.adminService.deleteNotification(req.user.id, notificationId);
  }

  // Create test notification (for development)
  @Post('notifications/test')
  async createTestNotification(@Request() req) {
    return this.adminService.createTestNotification(req.user.id);
  }

  // Create test revenue data (for development)
  @Post('test/revenue')
  async createTestRevenue(@Request() req) {
    return this.adminService.createTestRevenue();
  }

  @Get('users/pending')
  async getPendingUsers(
    @Query('page') page?: string,
    @Query('limit') limit?: string
  ) {
    const pageNum = page ? Math.max(1, parseInt(page, 10) || 1) : 1;
    const limitNum = limit ? Math.max(1, Math.min(100, parseInt(limit, 10) || 10)) : 10;
    return this.adminService.getPendingUsers(pageNum, limitNum);
  }

  @Get('users/approved')
  async getApprovedUsers(
    @Query('page') page?: string,
    @Query('limit') limit?: string
  ) {
    const pageNum = page ? Math.max(1, parseInt(page, 10) || 1) : 1;
    const limitNum = limit ? Math.max(1, Math.min(100, parseInt(limit, 10) || 10)) : 10;
    return this.adminService.getApprovedUsers(pageNum, limitNum);
  }

  @Get('users/rejected')
  async getRejectedUsers(
    @Query('page') page?: string,
    @Query('limit') limit?: string
  ) {
    const pageNum = page ? Math.max(1, parseInt(page, 10) || 1) : 1;
    const limitNum = limit ? Math.max(1, Math.min(100, parseInt(limit, 10) || 10)) : 10;
    return this.adminService.getRejectedUsers(pageNum, limitNum);
  }

  @Get('users/search')
  async searchUsers(
    @Query('email') email?: string,
    @Query('name') name?: string,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string
  ) {
    const pageNum = page ? Math.max(1, parseInt(page, 10) || 1) : 1;
    const limitNum = limit ? Math.max(1, Math.min(100, parseInt(limit, 10) || 10)) : 10;
    return this.adminService.searchUsers({ email, name, status }, pageNum, limitNum);
  }

  @Get('users/all')
  async getAllUsers(
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string
  ) {
    const pageNum = page ? Math.max(1, parseInt(page, 10) || 1) : 1;
    const limitNum = limit ? Math.max(1, Math.min(100, parseInt(limit, 10) || 10)) : 10;
    return this.adminService.getAllUsers(status, pageNum, limitNum);
  }

  @Get('users/:userId')
  async getUserById(@Param('userId', ParseIntPipe) userId: number) {
    return this.adminService.getUserById(userId);
  }

  @Post('users/approve')
  async approveUser(
    @Request() req,
    @Query('user_id') userId: string
  ) {
    const userIdNum = parseInt(userId, 10);
    if (!userIdNum || isNaN(userIdNum)) {
      throw new BadRequestException('Invalid user_id provided');
    }
    return this.adminService.approveUser(req.user.id, userIdNum);
  }

  @Post('users/reject')
  async rejectUser(
    @Request() req,
    @Query('user_id') userId: string,
    @Body('reason') reason: string
  ) {
    const userIdNum = parseInt(userId, 10);
    if (!userIdNum || isNaN(userIdNum)) {
      throw new BadRequestException('Invalid user_id provided');
    }
    return this.adminService.rejectUser(req.user.id, userIdNum, reason);
  }
}
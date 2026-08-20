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
import { UpdateAdminProfileDto, ChangeAdminPasswordDto } from './dto/admin-profile.dto';
import { PaginationQueryDto } from './dto/profile-status.dto';
import type { EmailButtonConfigDto } from './dto/email-button-config.dto';
import type { EmailTemplateDto, EmailTestDto, EmailPreviewDto, DuplicateTemplateDto } from './dto/email-template.dto';
import { AdminGuard } from '../auth/admin.guard';

@Controller('admin')
@UseGuards(AuthGuard('jwt'), AdminGuard)
export class AdminController {
  constructor(private adminService: AdminService) {}

@Get('dashboard')
async getDashboard(
  @Query('from') from?: string,
  @Query('to') to?: string,
  @Query('range') range?: 'today' | 'week' | 'month' | 'year'
) {
  // ✅ Convert query params to Date if present
  const fromDate = from ? new Date(from) : undefined;
  const toDate = to ? new Date(to) : undefined;

  // ✅ Fetch stats using optional args
  const stats = await this.adminService.getDashboardStats({ from: fromDate, to: toDate, range });

  // ✅ Decide range for the response label
  const rangeLabel = range || (from && to ? { from: fromDate, to: toDate } : 'all-time');

  // ✅ Build result object
  const result = {
    scans: stats.overview.totalScans,
    cards: stats.overview.totalCards,
    users: stats.overview.totalUsers,
    totalRevenue: stats.overview.totalRevenue,
    activeSubscriptions: stats.overview.activeSubscriptions,
    waitlist: stats.userStatus.waitlist,
    active: stats.userStatus.active,
    verifiedProfiles: stats.profileStatus.approved,
  };

  return {
    success: true,
    range: rangeLabel,
    data: result,
  };
}




  @Get('test-verified')
  async testVerified() {
    // Simple test endpoint without validation to check data
    return this.adminService.getVerifiedProfiles(1, 10);
  }

  // 🔍 DEBUG ENDPOINT - Check profile status without auth (temp)
  @Get('debug/profile/:id')
  async debugProfile(@Param('id', ParseIntPipe) profileId: number) {
    try {
      const profile = await this.adminService.getProfileById(profileId);
      return { 
        profile, 
        status: profile?.status || 'NOT_FOUND',
        message: profile?.status === 'DRAFT' ? 'Profile needs to be submitted for review first' : 'Ready for approval'
      };
    } catch (error) {
      return { error: error.message, profileId };
    }
  }

  // 🔧 DEBUG ENDPOINT - Force submit profile for review (temp)

  // Profile Approval Management Endpoints
  @Get('profiles/approved')
  async getApprovedProfiles(@Query() query: PaginationQueryDto) {
    return this.adminService.getProfilesByStatus('APPROVED', query.page, query.limit);
  }

  @Get('profiles/draft')
  async getDraftProfiles(@Query() query: PaginationQueryDto) {
    return this.adminService.getProfilesByStatus('DRAFT', query.page, query.limit);
  }

  @Get('profiles/:id/approve')
  async approveProfile(@Param('id', ParseIntPipe) profileId: number) {
    return this.adminService.updateProfileStatus(profileId, 'APPROVED');
  }

  @Get('profiles/:id/draft')
  async setProfileToDraft(@Param('id', ParseIntPipe) profileId: number) {
    return this.adminService.updateProfileStatus(profileId, 'DRAFT');
  }
  @Post('debug/profile/:id/force-submit')
  async forceSubmitProfile(@Param('id', ParseIntPipe) profileId: number) {
    return this.adminService.forceSubmitForReview(profileId);
  }

  // ✅ FIXED: All specific routes MUST come BEFORE parameterized routes
  // This prevents route conflicts where "verified" gets matched as ":profileId"
  
  @Get('profiles/pending')
  async getPendingProfiles(
    @Query('page') page?: string,
    @Query('limit') limit?: string
  ) {
    const pageNum = page ? Math.max(1, parseInt(page, 10) || 1) : 1;
    const limitNum = limit ? Math.max(1, Math.min(100, parseInt(limit, 10) || 10)) : 10;
    return this.adminService.getPendingProfiles(pageNum, limitNum);
  }

  @Get('profiles/verified')
  async getVerifiedProfiles(
    @Query('page') page?: string,
    @Query('limit') limit?: string
  ) {
    // ✅ Manual parsing prevents validation conflicts
    const pageNum = page ? Math.max(1, parseInt(page, 10) || 1) : 1;
    const limitNum = limit ? Math.max(1, Math.min(100, parseInt(limit, 10) || 10)) : 10;
    return this.adminService.getVerifiedProfiles(pageNum, limitNum);
  }

  @Get('profiles/all')
  async getAllProfiles(
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('username') username?: string,
    @Query('limit') limit?: string
  ) {
    // ✅ Validate and parse parameters safely
    const validStatuses = ['ALL', 'PENDING', 'PENDING_REVIEW', 'APPROVED', 'REJECTED', 'DRAFT'];
    const validStatus = validStatuses.includes(status || '') ? status : 'ALL';
    
    const pageNum = page ? Math.max(1, parseInt(page, 10) || 1) : 1;
    const limitNum = limit ? Math.max(1, Math.min(100, parseInt(limit, 10) || 10)) : 10;
    
    return this.adminService.getAllProfiles(validStatus, pageNum, limitNum,username);
  }

  // ⚠️ IMPORTANT: Parameterized routes MUST be placed AFTER all specific routes
  // to prevent route matching conflicts
  @Get('profiles/:profileId')
  async getProfile(@Param('profileId', ParseIntPipe) profileId: number) {
    return this.adminService.getProfileById(profileId);
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

  @Put('profiles/:profileId/toggle-active')
  async toggleProfileActive(
    @Param('profileId', ParseIntPipe) profileId: number,
    @Body('isActive') isActive: boolean | string
  ) {
    const active =
      isActive === true || isActive === 'true' || isActive === '1';
    return this.adminService.toggleProfileActive(profileId, active);
  }

  @Delete('profiles/:profileId')
  async deleteProfile(
    @Param('profileId', ParseIntPipe) profileId: number,
  ) {
    return this.adminService.deleteProfileById(profileId);
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

  // ✅ URL PARAMETER VERSIONS - For Postman compatibility
  @Post('profiles/:profileId/approve')
  async approveProfileByParam(
    @Request() req,
    @Param('profileId', ParseIntPipe) profileId: number
  ) {
    return this.adminService.approveProfile(req.user.id, profileId);
  }

  @Post('profiles/:profileId/reject')
  async rejectProfileByParam(
    @Request() req,
    @Param('profileId', ParseIntPipe) profileId: number,
    @Body('reason') reason: string
  ) {
    return this.adminService.rejectProfile(req.user.id, profileId, reason);
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
    @Query('username') username?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string
  ) {
    const pageNum = page ? Math.max(1, parseInt(page, 10) || 1) : 1;
    const limitNum = limit ? Math.max(1, Math.min(100, parseInt(limit, 10) || 10)) : 10;
    return this.adminService.getAllUsers(status, username, pageNum, limitNum);
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

  // ================================
  // 👤 ADMIN PROFILE MANAGEMENT
  // ================================

  @Get('profile')
  async getAdminProfile(@Request() req) {
    return this.adminService.getAdminProfile(req.user.id);
  }

  @Put('profile')
  async updateAdminProfile(
    @Request() req,
    @Body() updateProfileDto: UpdateAdminProfileDto
  ) {
    return this.adminService.updateAdminProfile(req.user.id, updateProfileDto);
  }

  @Put('profile/password')
  async changeAdminPassword(
    @Request() req,
    @Body() changePasswordDto: ChangeAdminPasswordDto
  ) {
    return this.adminService.changeAdminPassword(req.user.id, changePasswordDto);
  }

  // ========================
  // Enhanced Email Template Management
  // ========================

  @Post('templates/initialize')
  async initializeCustomizableTemplates() {
    return this.adminService.initializeCustomizableTemplates();
  }

  @Get('templates')
  async getCustomizableTemplates() {
    return this.adminService.getCustomizableTemplates();
  }

  @Get('templates/:name')
  async getCustomizableTemplate(@Param('name') name: string) {
    return this.adminService.getCustomizableTemplate(name);
  }

  @Post('templates')
  async createEmailTemplate(@Body() templateData: EmailTemplateDto) {
    return this.adminService.createEmailTemplate(templateData);
  }

  @Put('templates/:name')
  async updateCustomizableTemplate(
    @Param('name') name: string,
    @Body() templateData: EmailTemplateDto
  ) {
    console.log('Updating template:', name, templateData);
    return this.adminService.updateEmailTemplate(name, templateData);
  }

  @Delete('templates/:name')
  async deleteEmailTemplate(@Param('name') name: string) {
    return this.adminService.deleteEmailTemplate(name);
  }

  @Post('templates/:name/test')
  async sendTestEmail(
    @Param('name') name: string,
    @Body() testData: EmailTestDto
  ) {
    console.log('Sending test email with data:', testData.email);
    return this.adminService.sendTestEmail(name, testData.email, testData.variables || {});
  }

  @Post('templates/:name/preview')
  async previewEmailTemplate(
    @Param('name') name: string,
    @Body() previewData: EmailPreviewDto
  ) {
    return this.adminService.previewEmailTemplate(name, previewData.variables || {});
  }

  @Post('templates/duplicate')
  async duplicateEmailTemplate(@Body() duplicateData: DuplicateTemplateDto) {
    return this.adminService.duplicateEmailTemplate(
      duplicateData.sourceTemplateName, 
      duplicateData.newTemplateName
    );
  }

  @Get('templates/variables')
  async getEmailVariables() {
    return this.adminService.getEmailVariables();
  }

  // ========================
  // Email Button Configuration Management
  // ========================

  @Get('templates/button-configs')
  async getEmailButtonConfigurations() {
    return this.adminService.getEmailButtonConfigurations();
  }

  @Put('templates/:name/button-text')
  async updateTemplateButtonText(
    @Param('name') name: string,
    @Body() buttonConfigs: EmailButtonConfigDto
  ) {
    return this.adminService.updateTemplateWithButtonText(name, buttonConfigs);
  }

  // ========================
  // Add Dummy User Endpoint
  // ========================
  @Post('users/create-dummy')
  async createDummyUser(
    @Body() data: {
      email: string;
      name: string;
      phone: string;
      age: number;
      birthMonth?: number;
      birthYear?: number;
      height: string;
      bodyType: string;
      dealbreakers: string;
      bio: string;
      area?: string;
      county?: string;
      location: string;
      images: string[];
      gender?: string;
      interests?: string[];
    }
  ) {
    return this.adminService.createDummyUser(data);
  }
}

// 🔧 DEBUG CONTROLLER - No authentication required for testing
@Controller('debug/admin')
export class AdminDebugController {
  constructor(private adminService: AdminService) {}

  @Get('profile/:id')
  async debugProfile(@Param('id', ParseIntPipe) profileId: number) {
    try {
      const profile = await this.adminService.getProfileById(profileId);
      return { 
        profile, 
        status: profile?.status || 'NOT_FOUND',
        message: profile?.status === 'DRAFT' ? 'Profile needs to be submitted for review first' : 'Ready for approval'
      };
    } catch (error) {
      return { error: error.message, profileId };
    }
  }

  @Post('profile/:id/force-submit')
  async forceSubmitProfile(@Param('id', ParseIntPipe) profileId: number) {
    return this.adminService.forceSubmitForReview(profileId);
  }

  @Post('profile/:id/approve')
  async debugApproveProfile(@Param('id', ParseIntPipe) profileId: number) {
    return this.adminService.approveProfile(1, profileId); // Use admin ID 1
  }

  @Post('profile/:id/reject')
  async debugRejectProfile(
    @Param('id', ParseIntPipe) profileId: number,
    @Body('reason') reason: string = 'Debug rejection'
  ) {
    return this.adminService.rejectProfile(1, profileId, reason);
  }

  @Get('find-profile/:email')
  async findProfileByEmail(@Param('email') email: string) {
    return this.adminService.findProfileByEmail(email);
  }
}
import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { ProfileStatus, UserStatus } from '@prisma/client';
import { EmailService } from '../email/email.service';
import { randomUUID } from 'crypto';

@Injectable()
export class AdminService {
  constructor(
    private prisma: PrismaService,
    private emailService: EmailService,
  ) {}

  async getDashboardStats() {
    const [
      totalUsers,
      waitlistUsers,
      pendingProfiles,
      verifiedProfiles,
      rejectedProfiles,
      totalScans,
      activeCards
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.count({ where: { status: UserStatus.WAITLIST } }),
      this.prisma.profile.count({ where: { status: ProfileStatus.PENDING_REVIEW } }),
      this.prisma.profile.count({ where: { status: ProfileStatus.APPROVED } }),
      this.prisma.profile.count({ where: { status: ProfileStatus.REJECTED } }),
      this.prisma.scan.count(),
      this.prisma.qRCard.count({ where: { isActive: true } })
    ]);

    return {
      totalUsers,
      waitlistUsers,
      pendingProfiles,
      verifiedProfiles,
      rejectedProfiles,
      totalScans,
      activeCards,
    };
  }

  async getPendingProfiles(page: number = 1, limit: number = 10) {
    const profiles = await this.prisma.profile.findMany({
      where: { status: ProfileStatus.PENDING_REVIEW },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            createdAt: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
      skip: (page - 1) * limit,
      take: limit,
    });

    const totalCount = await this.prisma.profile.count({
      where: { status: ProfileStatus.PENDING_REVIEW },
    });

    return {
      profiles,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
    };
  }

  async getProfileById(profileId: number) {
    const profile = await this.prisma.profile.findUnique({
      where: { id: profileId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            phone: true,
            createdAt: true,
            paidSetupFee: true,
          },
        },
      },
    });

    if (!profile) {
      throw new HttpException('Profile not found', HttpStatus.NOT_FOUND);
    }

    return profile;
  }

  async approveProfile(adminId: number, profileId: number) {
    const profile = await this.prisma.profile.findUnique({
      where: { id: profileId },
      include: { user: true },
    });

    if (!profile) {
      throw new HttpException('Profile not found', HttpStatus.NOT_FOUND);
    }

    if (profile.status !== ProfileStatus.PENDING_REVIEW) {
      throw new HttpException('Profile is not pending review', HttpStatus.BAD_REQUEST);
    }

    // Update profile status
    const updatedProfile = await this.prisma.profile.update({
      where: { id: profileId },
      data: {
        status: ProfileStatus.APPROVED,
        reviewedAt: new Date(),
        reviewedBy: adminId,
        isActive: true,
      },
    });

    // Update user status
    await this.prisma.user.update({
      where: { id: profile.userId },
      data: { status: UserStatus.VERIFIED },
    });

    // Generate 50 QR cards for the approved profile
    const qrCards: any[] = [];
    for (let i = 0; i < 50; i++) {
      const uniqueId = randomUUID();
      const card = await this.prisma.qRCard.create({
        data: {
          profileId: profileId,
          userId: profile.userId,
          qrCode: uniqueId,
          scanCount: 0,
          maxScans: 5,
          isActive: true,
        },
      });
      qrCards.push(card);
    }

    // Generate tracking number for shipping
    const trackingNumber = `QR-${Date.now()}-${profile.userId}`;

    // Send approval email with tracking
    try {
      await this.emailService.sendApprovalEmail(
        profile.user.email,
        profile.user.name || 'User',
        trackingNumber,
      );
    } catch (error) {
      console.error('Failed to send approval email:', error);
    }

    // Create notification for user
    await this.prisma.notification.create({
      data: {
        adminId,
        type: 'profile_approved',
        title: 'Profile Approved - Cards Being Printed!',
        message: `Profile approved! 50 QR cards generated and queued for printing. Tracking: ${trackingNumber}`,
        data: { 
          userId: profile.userId, 
          profileId,
          trackingNumber,
          qrCardsGenerated: qrCards.length,
        },
      },
    });

    return {
      ...updatedProfile,
      qrCardsGenerated: qrCards.length,
      trackingNumber,
    };
  }

  async rejectProfile(adminId: number, profileId: number, reason: string) {
    const profile = await this.prisma.profile.findUnique({
      where: { id: profileId },
      include: { user: true },
    });

    if (!profile) {
      throw new HttpException('Profile not found', HttpStatus.NOT_FOUND);
    }

    if (profile.status !== ProfileStatus.PENDING_REVIEW) {
      throw new HttpException('Profile is not pending review', HttpStatus.BAD_REQUEST);
    }

    // Update profile status
    const updatedProfile = await this.prisma.profile.update({
      where: { id: profileId },
      data: {
        status: ProfileStatus.REJECTED,
        reviewedAt: new Date(),
        reviewedBy: adminId,
        rejectionReason: reason,
        isActive: false,
      },
    });

    // Update user status back to paid setup so they can re-edit
    await this.prisma.user.update({
      where: { id: profile.userId },
      data: { status: UserStatus.PAID_SETUP }, // Allow them to edit and resubmit
    });

    // Generate edit link for the user
    const editLink = `${process.env.FRONTEND_URL || 'https://yourapp.com'}/profile/edit`;

    // Send rejection email with feedback and edit link
    try {
      await this.emailService.sendRejectionEmail(
        profile.user.email,
        profile.user.name || 'User',
        reason,
        editLink,
      );
    } catch (error) {
      console.error('Failed to send rejection email:', error);
    }

    // Create notification for user
    await this.prisma.notification.create({
      data: {
        adminId,
        type: 'profile_rejected',
        title: 'Profile Needs Updates',
        message: `Profile requires changes. Reason: ${reason}. Please edit and resubmit.`,
        data: { userId: profile.userId, profileId, reason, editLink },
      },
    });

    return updatedProfile;
  }

  async getVerifiedProfiles(page: number = 1, limit: number = 10) {
    const profiles = await this.prisma.profile.findMany({
      where: { status: ProfileStatus.APPROVED },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            createdAt: true,
          },
        },
        qrCards: {
          select: {
            id: true,
            scanCount: true,
            isActive: true,
          },
        },
      },
      orderBy: { reviewedAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    });

    const totalCount = await this.prisma.profile.count({
      where: { status: ProfileStatus.APPROVED },
    });

    return {
      profiles,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
    };
  }

  async unverifyProfile(adminId: number, profileId: number, reason: string) {
    const profile = await this.prisma.profile.findUnique({
      where: { id: profileId },
    });

    if (!profile) {
      throw new HttpException('Profile not found', HttpStatus.NOT_FOUND);
    }

    if (profile.status !== ProfileStatus.APPROVED) {
      throw new HttpException('Profile is not approved', HttpStatus.BAD_REQUEST);
    }

    // Update profile status
    const updatedProfile = await this.prisma.profile.update({
      where: { id: profileId },
      data: {
        status: ProfileStatus.REJECTED,
        isActive: false,
        rejectionReason: reason,
      },
    });

    // Deactivate all QR cards
    await this.prisma.qRCard.updateMany({
      where: { profileId },
      data: { isActive: false },
    });

    return updatedProfile;
  }

  async getNotifications(adminId: number, page: number = 1, limit: number = 20) {
    const notifications = await this.prisma.notification.findMany({
      where: { adminId },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    });

    const unreadCount = await this.prisma.notification.count({
      where: { adminId, isRead: false },
    });

    return {
      notifications,
      unreadCount,
      pagination: {
        page,
        limit,
        totalCount: notifications.length,
      },
    };
  }

  async markNotificationAsRead(adminId: number, notificationId: number) {
    return this.prisma.notification.updateMany({
      where: { id: notificationId, adminId },
      data: { isRead: true },
    });
  }

  async getPendingUsers(page: number = 1, limit: number = 10) {
    const users = await this.prisma.user.findMany({
      where: { 
        isApproved: false,
        status: UserStatus.WAITLIST 
      },
      select: {
        id: true,
        email: true,
        name: true,
        status: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    });

    const totalCount = await this.prisma.user.count({
      where: { 
        isApproved: false,
        status: UserStatus.WAITLIST 
      },
    });

    return {
      users,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
    };
  }

  async approveUser(adminId: number, userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new HttpException('User not found', HttpStatus.NOT_FOUND);
    }

    if (user.isApproved) {
      throw new HttpException('User is already approved', HttpStatus.BAD_REQUEST);
    }

    // Update user approval status
    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: {
        isApproved: true,
        approvedAt: new Date(),
        status: UserStatus.ACTIVE,
      },
    });

    // Send welcome email
    await this.emailService.sendWelcomeEmail(
      user.email,
      user.name,
    );

    // Create notification
    await this.prisma.notification.create({
      data: {
        adminId,
        type: 'user_approved',
        title: 'User Approved',
        message: `${user.name} (${user.email}) has been approved and welcomed to the platform`,
        data: {
          userId: user.id,
          email: user.email,
          name: user.name,
        },
      },
    });

    return updatedUser;
  }

  async rejectUser(adminId: number, userId: number, reason: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new HttpException('User not found', HttpStatus.NOT_FOUND);
    }

    if (user.isApproved) {
      throw new HttpException('Cannot reject an approved user', HttpStatus.BAD_REQUEST);
    }

    // Update user status
    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: {
        status: UserStatus.REJECTED,
      },
    });

    // Send rejection email
    await this.emailService.sendUserRejectionEmail(
      user.email,
      user.name,
      reason,
    );

    // Create notification
    await this.prisma.notification.create({
      data: {
        adminId,
        type: 'user_rejected',
        title: 'User Rejected',
        message: `${user.name} (${user.email}) has been rejected. Reason: ${reason}`,
        data: {
          userId: user.id,
          email: user.email,
          name: user.name,
          reason,
        },
      },
    });

    return updatedUser;
  }
}
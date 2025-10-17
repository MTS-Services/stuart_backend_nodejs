import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { ProfileStatus, UserStatus, SubscriptionStatus, SubscriptionPlan } from '@prisma/client';
import { EmailService } from '../email/email.service';
import { randomUUID } from 'crypto';

@Injectable()
export class AdminService {
  constructor(
    private prisma: PrismaService,
    private emailService: EmailService,
  ) {}

  async getDashboardStats() {
    // Get current time boundaries
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfToday = new Date(startOfToday.getTime() + 24 * 60 * 60 * 1000);
    const startOfWeek = new Date(startOfToday.getTime() - (now.getDay() * 24 * 60 * 60 * 1000));
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfYear = new Date(now.getFullYear(), 0, 1);

    const [
      // Total counts
      totalUsers,
      totalProfiles,
      totalScans,
      totalCards,
      totalRevenue,
      
      // Today's analytics
      todayUsers,
      todayProfiles,
      todayScans,
      todayCards,
      todayRevenue,
      todayPaymentCount,
      
      // Week's analytics
      weekUsers,
      weekProfiles,
      weekScans,
      weekCards,
      weeklyRevenue,
      weeklyPaymentCount,
      
      // Month's analytics
      monthUsers,
      monthProfiles,
      monthScans,
      monthCards,
      monthlyRevenue,
      monthlyPaymentCount,
      
      // Year's analytics
      yearUsers,
      yearProfiles,
      yearScans,
      yearCards,
      yearlyRevenue,
      
      // Status-based counts
      waitlistUsers,
      activeUsers,
      verifiedUsers,
      pendingProfiles,
      approvedProfiles,
      rejectedProfiles,
      activeCards,
      
      // Active subscriptions for projected revenue
      activeSubscriptions
    ] = await Promise.all([
      // Total counts
      this.prisma.user.count(),
      this.prisma.profile.count(),
      this.prisma.scan.count(),
      this.prisma.qRCard.count(),
      this.prisma.payment.aggregate({
        where: { status: 'completed' },
        _sum: { amount: true },
      }),
      
      // Today's counts
      this.prisma.user.count({
        where: {
          createdAt: {
            gte: startOfToday,
            lt: endOfToday
          }
        }
      }),
      this.prisma.profile.count({
        where: {
          createdAt: {
            gte: startOfToday,
            lt: endOfToday
          }
        }
      }),
      this.prisma.scan.count({
        where: {
          createdAt: {
            gte: startOfToday,
            lt: endOfToday
          }
        }
      }),
      this.prisma.qRCard.count({
        where: {
          createdAt: {
            gte: startOfToday,
            lt: endOfToday
          }
        }
      }),
      this.prisma.payment.aggregate({
        where: {
          status: 'completed',
          createdAt: {
            gte: startOfToday,
            lt: endOfToday
          }
        },
        _sum: { amount: true },
      }),
      this.prisma.payment.count({
        where: {
          status: 'completed',
          createdAt: {
            gte: startOfToday,
            lt: endOfToday
          }
        }
      }),
      
      // Week's counts
      this.prisma.user.count({
        where: {
          createdAt: {
            gte: startOfWeek,
            lt: now
          }
        }
      }),
      this.prisma.profile.count({
        where: {
          createdAt: {
            gte: startOfWeek,
            lt: now
          }
        }
      }),
      this.prisma.scan.count({
        where: {
          createdAt: {
            gte: startOfWeek,
            lt: now
          }
        }
      }),
      this.prisma.qRCard.count({
        where: {
          createdAt: {
            gte: startOfWeek,
            lt: now
          }
        }
      }),
      this.prisma.payment.aggregate({
        where: {
          status: 'completed',
          createdAt: {
            gte: startOfWeek,
            lt: now
          }
        },
        _sum: { amount: true },
      }),
      this.prisma.payment.count({
        where: {
          status: 'completed',
          createdAt: {
            gte: startOfWeek,
            lt: now
          }
        }
      }),
      
      // Month's counts
      this.prisma.user.count({
        where: {
          createdAt: {
            gte: startOfMonth,
            lt: now
          }
        }
      }),
      this.prisma.profile.count({
        where: {
          createdAt: {
            gte: startOfMonth,
            lt: now
          }
        }
      }),
      this.prisma.scan.count({
        where: {
          createdAt: {
            gte: startOfMonth,
            lt: now
          }
        }
      }),
      this.prisma.qRCard.count({
        where: {
          createdAt: {
            gte: startOfMonth,
            lt: now
          }
        }
      }),
      this.prisma.payment.aggregate({
        where: {
          status: 'completed',
          createdAt: {
            gte: startOfMonth,
            lt: now
          }
        },
        _sum: { amount: true },
      }),
      this.prisma.payment.count({
        where: {
          status: 'completed',
          createdAt: {
            gte: startOfMonth,
            lt: now
          }
        }
      }),
      
      // Year's counts
      this.prisma.user.count({
        where: {
          createdAt: {
            gte: startOfYear,
            lt: now
          }
        }
      }),
      this.prisma.profile.count({
        where: {
          createdAt: {
            gte: startOfYear,
            lt: now
          }
        }
      }),
      this.prisma.scan.count({
        where: {
          createdAt: {
            gte: startOfYear,
            lt: now
          }
        }
      }),
      this.prisma.qRCard.count({
        where: {
          createdAt: {
            gte: startOfYear,
            lt: now
          }
        }
      }),
      this.prisma.payment.aggregate({
        where: {
          status: 'completed',
          createdAt: {
            gte: startOfYear,
            lt: now
          }
        },
        _sum: { amount: true },
      }),
      
      // Status-based counts
      this.prisma.user.count({ where: { status: UserStatus.WAITLIST } }),
      this.prisma.user.count({ where: { status: UserStatus.ACTIVE } }),
      this.prisma.user.count({ where: { status: UserStatus.VERIFIED } }),
      this.prisma.profile.count({ where: { status: ProfileStatus.PENDING_REVIEW } }),
      this.prisma.profile.count({ where: { status: ProfileStatus.APPROVED } }),
      this.prisma.profile.count({ where: { status: ProfileStatus.REJECTED } }),
      this.prisma.qRCard.count({ where: { isActive: true } }),
      
      // Active subscriptions for projected revenue
      this.prisma.subscription.count({
        where: { status: SubscriptionStatus.ACTIVE }
      })
    ]);

    // Calculate projected daily revenue from active subscriptions
    const subscriptionDetails = await this.prisma.subscription.groupBy({
      by: ['plan'],
      where: { status: SubscriptionStatus.ACTIVE },
      _count: { _all: true }
    });

    let projectedDailyRevenue = 0;
    subscriptionDetails.forEach(sub => {
      const count = sub._count._all;
      if (sub.plan === SubscriptionPlan.MONTHLY) {
        projectedDailyRevenue += (count * 13) / 30;
      } else if (sub.plan === SubscriptionPlan.YEARLY) {
        projectedDailyRevenue += (count * 120) / 365;
      }
    });

    return {
      // Overview Stats
      overview: {
        totalUsers,
        totalProfiles,
        totalScans,
        totalCards,
        totalRevenue: parseFloat(totalRevenue._sum.amount?.toString() || '0'),
        activeSubscriptions
      },
      
      // Today's Analytics
      today: {
        users: todayUsers,
        profiles: todayProfiles,
        scans: todayScans,
        cards: todayCards,
        revenue: {
          amount: parseFloat(todayRevenue._sum.amount?.toString() || '0'),
          payments: todayPaymentCount,
          currency: 'USD'
        }
      },
      
      // Tomorrow's Projections
      tomorrow: {
        projectedRevenue: parseFloat(projectedDailyRevenue.toFixed(2)),
        currency: 'USD',
        note: 'Based on active subscriptions'
      },
      
      // This Week's Analytics
      week: {
        users: weekUsers,
        profiles: weekProfiles,
        scans: weekScans,
        cards: weekCards,
        revenue: {
          amount: parseFloat(weeklyRevenue._sum.amount?.toString() || '0'),
          payments: weeklyPaymentCount,
          currency: 'USD'
        }
      },
      
      // This Month's Analytics
      month: {
        users: monthUsers,
        profiles: monthProfiles,
        scans: monthScans,
        cards: monthCards,
        revenue: {
          amount: parseFloat(monthlyRevenue._sum.amount?.toString() || '0'),
          payments: monthlyPaymentCount,
          currency: 'USD'
        }
      },
      
      // This Year's Analytics
      year: {
        users: yearUsers,
        profiles: yearProfiles,
        scans: yearScans,
        cards: yearCards,
        revenue: {
          amount: parseFloat(yearlyRevenue._sum.amount?.toString() || '0'),
          currency: 'USD'
        }
      },
      
      // Status Breakdown
      userStatus: {
        waitlist: waitlistUsers,
        active: activeUsers,
        verified: verifiedUsers,
        total: totalUsers
      },
      
      profileStatus: {
        pending: pendingProfiles,
        approved: approvedProfiles,
        rejected: rejectedProfiles,
        total: totalProfiles
      },
      
      cardStatus: {
        active: activeCards,
        total: totalCards
      },
      
      // Legacy fields for backward compatibility
      totalUsers,
      waitlistUsers,
      pendingProfiles,
      verifiedProfiles: approvedProfiles,
      rejectedProfiles,
      totalScans,
      activeCards
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

  async getAllProfiles(status?: string, page: number = 1, limit: number = 10) {
    // Build where clause based on status filter
    const whereClause: any = {};
    
    if (status && status !== 'ALL') {
      // Map status to ProfileStatus enum
      const statusMap = {
        'PENDING': ProfileStatus.PENDING_REVIEW,
        'APPROVED': ProfileStatus.APPROVED,
        'REJECTED': ProfileStatus.REJECTED,
        'DRAFT': ProfileStatus.DRAFT
      };
      
      if (statusMap[status.toUpperCase()]) {
        whereClause.status = statusMap[status.toUpperCase()];
      }
    }

    const profiles = await this.prisma.profile.findMany({
      where: whereClause,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            status: true,
            isApproved: true,
            paidSetupFee: true,
            createdAt: true,
            updatedAt: true,
          },
        },
        qrCards: {
          select: {
            id: true,
            scanCount: true,
            maxScans: true,
            isActive: true,
            createdAt: true,
          },
        },
        reviewer: {
          select: {
            id: true,
            email: true,
            username: true,
          },
        },
      },
      orderBy: [
        { createdAt: 'desc' },
        { updatedAt: 'desc' }
      ],
      skip: (page - 1) * limit,
      take: limit,
    });

    const totalCount = await this.prisma.profile.count({
      where: whereClause,
    });

    // Get status statistics for overview
    const statusStats = await this.prisma.profile.groupBy({
      by: ['status'],
      _count: { status: true },
    });

    const stats = {
      total: totalCount,
      pending: statusStats.find(s => s.status === ProfileStatus.PENDING_REVIEW)?._count.status || 0,
      approved: statusStats.find(s => s.status === ProfileStatus.APPROVED)?._count.status || 0,
      rejected: statusStats.find(s => s.status === ProfileStatus.REJECTED)?._count.status || 0,
      draft: statusStats.find(s => s.status === ProfileStatus.DRAFT)?._count.status || 0,
    };

    return {
      profiles,
      pagination: {
        currentPage: page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
        hasNextPage: page < Math.ceil(totalCount / limit),
        hasPrevPage: page > 1,
      },
      stats,
      filters: {
        status: status || 'ALL',
        availableStatuses: ['ALL', 'PENDING', 'APPROVED', 'REJECTED', 'DRAFT']
      }
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

    // Send welcome email (non-blocking - don't fail the approval if email fails)
    try {
      await this.emailService.sendWelcomeEmail(
        user.email,
        user.name,
      );
    } catch (error) {
      console.error('Failed to send welcome email:', error.message);
      // Continue execution - email failure shouldn't block user approval
    }

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

  // Enhanced notification methods
  async getUnreadNotificationsCount(adminId: number) {
    const count = await this.prisma.notification.count({
      where: { 
        adminId,
        isRead: false 
      },
    });

    return { 
      unreadCount: count,
      timestamp: new Date().toISOString()
    };
  }

  async markAllNotificationsAsRead(adminId: number) {
    const result = await this.prisma.notification.updateMany({
      where: { 
        adminId,
        isRead: false 
      },
      data: { isRead: true },
    });

    return {
      success: true,
      markedAsRead: result.count,
      message: `Marked ${result.count} notifications as read`
    };
  }

  async getRecentNotifications(adminId: number, hours: number = 24) {
    const since = new Date();
    since.setHours(since.getHours() - hours);

    const notifications = await this.prisma.notification.findMany({
      where: {
        adminId,
        createdAt: {
          gte: since,
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 50, // Limit to 50 recent notifications
    });

    return {
      success: true,
      recentNotifications: notifications,
      timeframe: `Last ${hours} hours`,
      count: notifications.length,
    };
  }

  async deleteNotification(adminId: number, notificationId: number) {
    const notification = await this.prisma.notification.findFirst({
      where: { 
        id: notificationId,
        adminId 
      },
    });

    if (!notification) {
      throw new HttpException('Notification not found', HttpStatus.NOT_FOUND);
    }

    await this.prisma.notification.delete({
      where: { id: notificationId },
    });

    return {
      success: true,
      message: 'Notification deleted successfully',
      deletedId: notificationId
    };
  }

  async createTestNotification(adminId: number) {
    const testNotification = await this.prisma.notification.create({
      data: {
        adminId,
        type: 'test_notification',
        title: 'Test Notification',
        message: 'This is a test notification created at ' + new Date().toLocaleString(),
        data: {
          testData: true,
          timestamp: new Date().toISOString(),
          environment: process.env.NODE_ENV || 'development',
        },
      },
    });

    return {
      success: true,
      message: 'Test notification created successfully',
      notification: testNotification
    };
  }

  // Enhanced notification creation helper
  async createNotification(
    adminId: number, 
    type: string, 
    title: string, 
    message: string, 
    data: any = null
  ) {
    return this.prisma.notification.create({
      data: {
        adminId,
        type,
        title,
        message,
        data,
      },
    });
  }

  // Additional user management methods
  async getApprovedUsers(page: number = 1, limit: number = 10) {
    const users = await this.prisma.user.findMany({
      where: { 
        isApproved: true,
        status: UserStatus.ACTIVE 
      },
      select: {
        id: true,
        email: true,
        name: true,
        status: true,
        createdAt: true,
        approvedAt: true,
        paidSetupFee: true,
        profile: {
          select: {
            status: true,
            createdAt: true,
          }
        }
      },
      orderBy: { approvedAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    });

    const totalCount = await this.prisma.user.count({
      where: { 
        isApproved: true,
        status: UserStatus.ACTIVE 
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

  async getRejectedUsers(page: number = 1, limit: number = 10) {
    const users = await this.prisma.user.findMany({
      where: { 
        status: UserStatus.REJECTED 
      },
      select: {
        id: true,
        email: true,
        name: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { updatedAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    });

    const totalCount = await this.prisma.user.count({
      where: { 
        status: UserStatus.REJECTED 
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

  async getAllUsers(status?: string, page: number = 1, limit: number = 10) {
    const whereClause: any = {};
    
    if (status && status !== 'ALL') {
      whereClause.status = status;
    }

    const users = await this.prisma.user.findMany({
      where: whereClause,
      select: {
        id: true,
        email: true,
        name: true,
        status: true,
        isApproved: true,
        createdAt: true,
        updatedAt: true,
        approvedAt: true,
        paidSetupFee: true,
        profile: {
          select: {
            status: true,
            createdAt: true,
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    });

    const totalCount = await this.prisma.user.count({
      where: whereClause,
    });

    // Get summary stats
    const stats = await this.getDashboardStats();

    return {
      users,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
      stats
    };
  }

  async getUserById(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        profile: {
          include: {
            qrCards: {
              select: {
                id: true,
                qrCode: true,
                scanCount: true,
                maxScans: true,
                isActive: true,
                createdAt: true,
              }
            }
          }
        }
      },
    });

    if (!user) {
      throw new HttpException('User not found', HttpStatus.NOT_FOUND);
    }

    // Get user's payments separately since there's no direct relation
    const userPayments = await this.prisma.payment.findMany({
      where: { userId: userId },
      orderBy: { createdAt: 'desc' }
    });

    return {
      ...user,
      payments: userPayments
    };
  }

  async searchUsers(
    filters: { email?: string; name?: string; status?: string },
    page: number = 1,
    limit: number = 10
  ) {
    const whereClause: any = {};

    if (filters.email) {
      whereClause.email = {
        contains: filters.email,
        mode: 'insensitive'
      };
    }

    if (filters.name) {
      whereClause.name = {
        contains: filters.name,
        mode: 'insensitive'
      };
    }

    if (filters.status && filters.status !== 'ALL') {
      whereClause.status = filters.status;
    }

    const users = await this.prisma.user.findMany({
      where: whereClause,
      select: {
        id: true,
        email: true,
        name: true,
        status: true,
        isApproved: true,
        createdAt: true,
        updatedAt: true,
        approvedAt: true,
        paidSetupFee: true,
        profile: {
          select: {
            status: true,
            createdAt: true,
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    });

    const totalCount = await this.prisma.user.count({
      where: whereClause,
    });

    return {
      users,
      searchFilters: filters,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
    };
  }

  // Create notifications for all admins
  async createNotificationForAllAdmins(
    type: string, 
    title: string, 
    message: string, 
    data: any = null
  ) {
    // Get all admin users (assuming you have a way to identify admins)
    // For now, let's use adminId = 1 as default admin
    const defaultAdminId = 1;
    
    return this.createNotification(defaultAdminId, type, title, message, data);
  }

  // Create test revenue data (for development)
  async createTestRevenue() {
    const now = new Date();
    
    // Create test users for different time periods
    const testUsers = [
      { email: 'test_today1@example.com', name: 'Today User 1', status: UserStatus.ACTIVE, createdAt: now },
      { email: 'test_today2@example.com', name: 'Today User 2', status: UserStatus.WAITLIST, createdAt: now },
      { email: 'test_week1@example.com', name: 'Week User 1', status: UserStatus.VERIFIED, createdAt: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000) },
      { email: 'test_month1@example.com', name: 'Month User 1', status: UserStatus.ACTIVE, createdAt: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000) }
    ];

    // Create test payments for different time periods
    const testPayments = [
      // Today's payments
      {
        userId: 1,
        amount: 69.00,
        currency: 'USD',
        type: 'setup_fee',
        status: 'completed',
        createdAt: now
      },
      {
        userId: 2, 
        amount: 13.00,
        currency: 'USD',
        type: 'subscription',
        status: 'completed',
        createdAt: now
      },
      // Yesterday's payments
      {
        userId: 3,
        amount: 69.00,
        currency: 'USD',
        type: 'setup_fee', 
        status: 'completed',
        createdAt: new Date(now.getTime() - 24 * 60 * 60 * 1000)
      },
      // This week's payments
      {
        userId: 4,
        amount: 120.00,
        currency: 'USD',
        type: 'subscription',
        status: 'completed',
        createdAt: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000)
      },
      // This month's payments
      {
        userId: 5,
        amount: 69.00,
        currency: 'USD',
        type: 'setup_fee',
        status: 'completed',
        createdAt: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000)
      }
    ];

    // Create test subscriptions for projected revenue
    const testSubscriptions = [
      {
        userId: 1,
        plan: SubscriptionPlan.MONTHLY,
        status: SubscriptionStatus.ACTIVE,
        amount: 13.00,
        currency: 'USD',
        startDate: now
      },
      {
        userId: 4,
        plan: SubscriptionPlan.YEARLY,
        status: SubscriptionStatus.ACTIVE,
        amount: 120.00,
        currency: 'USD',
        startDate: now
      }
    ];

    // Create the test data
    try {
      // Delete existing test data first
      await this.prisma.payment.deleteMany({
        where: {
          stripePaymentIntentId: {
            startsWith: 'test_'
          }
        }
      });
      
      // Create users with different creation dates
      const createdUsersCount = await this.prisma.user.count({
        where: {
          email: {
            startsWith: 'test_'
          }
        }
      });

      // Create payments
      const createdPayments = await this.prisma.payment.createMany({
        data: testPayments.map((payment, index) => ({
          ...payment,
          stripePaymentIntentId: `test_${payment.userId}_${payment.type}_${index}`
        })),
        skipDuplicates: true
      });

      // Create subscriptions (delete existing first)
      await this.prisma.subscription.deleteMany({
        where: {
          userId: {
            in: testSubscriptions.map(s => s.userId)
          }
        }
      });

      const createdSubscriptions = await this.prisma.subscription.createMany({
        data: testSubscriptions,
        skipDuplicates: true
      });

      return {
        message: 'Test revenue data created successfully',
        paymentsCreated: testPayments.length,
        subscriptionsCreated: testSubscriptions.length,
        totalRevenue: testPayments.reduce((sum, p) => sum + p.amount, 0)
      };
    } catch (error) {
      throw new HttpException(
        `Failed to create test revenue data: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
}
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

  async getProfilesByStatus(status: ProfileStatus, page: number = 1, limit: number = 10) {
    const skip = (page - 1) * limit;
    
    const [profiles, total] = await Promise.all([
      this.prisma.profile.findMany({
        where: { status },
        skip,
        take: limit,
        include: {
          user: {
            select: {
              email: true,
              name: true
            }
          }
        },
        orderBy: {
          updatedAt: 'desc'
        }
      }),
      this.prisma.profile.count({
        where: { status }
      })
    ]);

    return {
      profiles,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  async updateProfileStatus(profileId: number, status: ProfileStatus) {
    const profile = await this.prisma.profile.findUnique({
      where: { id: profileId },
      include: {
        user: {
          select: {
            email: true,
            name: true
          }
        }
      }
    });

    if (!profile) {
      throw new HttpException('Profile not found', HttpStatus.NOT_FOUND);
    }

    const updatedProfile = await this.prisma.profile.update({
      where: { id: profileId },
      data: { status },
      include: {
        user: {
          select: {
            email: true,
            name: true
          }
        }
      }
    });

    // Send email notification
    if (status === 'APPROVED') {
      await this.emailService.sendSignupLink(
        profile.user.email,
        profile.user.name,
        'Your profile has been approved!'
      );
    }

    return updatedProfile;
  }

// async getDashboardStats({
//   from,
//   to,
//   range,
// }: {
//   from?: Date;
//   to?: Date;
//   range?: 'today' | 'week' | 'month' | 'year';
// } = {}) {
//   const now = new Date();

//   // --- Define time boundaries ---
//   const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
//   const endOfToday = new Date(startOfToday.getTime() + 24 * 60 * 60 * 1000);

//   const startOfWeek = new Date(startOfToday.getTime() - now.getDay() * 24 * 60 * 60 * 1000);
//   const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
//   const startOfYear = new Date(now.getFullYear(), 0, 1);

//   const ranges = {
//     today: { from: startOfToday, to: endOfToday },
//     week: { from: startOfWeek, to: endOfToday },
//     month: { from: startOfMonth, to: endOfToday },
//     year: { from: startOfYear, to: endOfToday },
//   };

//   // --- Determine which range(s) to use ---
//   let selectedRange: { from: Date; to: Date } | undefined;
//   if (range && ranges[range]) {
//     selectedRange = ranges[range];
//   } else if (from && to) {
//     selectedRange = { from, to };
//   }

//   let rangesToUse: [string, { from: Date; to: Date }][];
//   if (selectedRange) {
//     rangesToUse = [[range || 'custom', selectedRange]];
//   } else {
//     rangesToUse = Object.entries(ranges) as [string, { from: Date; to: Date }][];
//   }

//   // --- Fetch totals and counts ---
//   const [
//     totalUsers,
//     totalProfiles,
//     totalScans,
//     totalCards,
//     totalRevenue,

//     waitlistUsers,
//     activeUsers,
//     verifiedUsers,
//     pendingProfiles,
//     approvedProfiles,
//     rejectedProfiles,
//     activeCards,
//     activeSubscriptions,
//   ] = await Promise.all([
//     this.prisma.user.count(),
//     this.prisma.profile.count(),
//     this.prisma.scan.count(),
//     this.prisma.qRCard.count(),
//     this.prisma.payment.aggregate({ where: { status: 'completed' }, _sum: { amount: true } }),

//     this.prisma.user.count({ where: { status: UserStatus.WAITLIST } }),
//     this.prisma.user.count({ where: { status: UserStatus.ACTIVE } }),
//     this.prisma.user.count({ where: { status: UserStatus.VERIFIED } }),
//     this.prisma.profile.count({ where: { status: ProfileStatus.PENDING_REVIEW } }),
//     this.prisma.profile.count({ where: { status: ProfileStatus.APPROVED } }),
//     this.prisma.profile.count({ where: { status: ProfileStatus.REJECTED } }),
//     this.prisma.qRCard.count({ where: { isActive: true } }),
//     this.prisma.subscription.count({ where: { status: SubscriptionStatus.ACTIVE } }),
//   ]);

//   // --- Fetch analytics for selected range(s) ---
//   const analytics = await Promise.all(
//     rangesToUse.map(async ([key, { from, to }]) => {
//       const rangeFilter = { gte: from, lt: to };
//       const [users, profiles, scans, cards, revenueAgg, paymentCount] = await Promise.all([
//         this.prisma.user.count({ where: { createdAt: rangeFilter } }),
//         this.prisma.profile.count({ where: { createdAt: rangeFilter } }),
//         this.prisma.scan.count({ where: { createdAt: rangeFilter } }),
//         this.prisma.qRCard.count({ where: { createdAt: rangeFilter } }),
//         this.prisma.payment.aggregate({
//           where: { status: 'completed', createdAt: rangeFilter },
//           _sum: { amount: true },
//         }),
//         this.prisma.payment.count({
//           where: { status: 'completed', createdAt: rangeFilter },
//         }),
//       ]);

//       return [
//         key,
//         {
//           users,
//           profiles,
//           scans,
//           cards,
//           revenue: {
//             amount: parseFloat(revenueAgg._sum.amount?.toString() || '0'),
//             payments: paymentCount,
//             currency: 'USD',
//           },
//         },
//       ] as const;
//     }),
//   );

//   const analyticsByRange = Object.fromEntries(analytics);

//   // --- Projected daily revenue from subscriptions ---
//   const subs = await this.prisma.subscription.groupBy({
//     by: ['plan'],
//     where: { status: SubscriptionStatus.ACTIVE },
//     _count: { _all: true },
//   });

//   let projectedDailyRevenue = 0;
//   subs.forEach((sub) => {
//     const count = sub._count._all;
//     if (sub.plan === SubscriptionPlan.MONTHLY) projectedDailyRevenue += (count * 13) / 30;
//     else if (sub.plan === SubscriptionPlan.YEARLY) projectedDailyRevenue += (count * 120) / 365;
//   });

//   // --- Return combined result ---
//   return {
//     overview: {
//       totalUsers,
//       totalProfiles,
//       totalScans,
//       totalCards,
//       totalRevenue: parseFloat(totalRevenue._sum.amount?.toString() || '0'),
//       activeSubscriptions,
//     },
//     analytics: analyticsByRange,
//     tomorrowProjection: {
//       projectedRevenue: parseFloat(projectedDailyRevenue.toFixed(2)),
//       currency: 'USD',
//     },
//     userStatus: {
//       waitlist: waitlistUsers,
//       active: activeUsers,
//       verified: verifiedUsers,
//       total: totalUsers,
//     },
//     profileStatus: {
//       pending: pendingProfiles,
//       approved: approvedProfiles,
//       rejected: rejectedProfiles,
//       total: totalProfiles,
//     },
//     cardStatus: {
//       active: activeCards,
//       total: totalCards,
//     },
//   };
// }
  private getDateRange(range: string): { gte: Date; lte: Date } {
    const now = new Date();
    let from: Date;

    switch (range) {
      case 'today':
        from = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;

      case 'week':
        from = new Date(now);
        from.setDate(now.getDate() - 7);
        break;

      case 'month':
        from = new Date(now.getFullYear(), now.getMonth(), 1);
        break;

      case 'year':
        from = new Date(now.getFullYear(), 0, 1);
        break;

      default:
        from = new Date(0); // all-time
        break;
    }

    return {
      gte: from,
      lte: now,
    };
  }

 async getDashboardStats(params: { from?: Date; to?: Date; range?: 'today' | 'week' | 'month' | 'year' } = {}) {
    const { from, to, range } = params;

    // 🗓 Build date filter
    const dateFilter =
      from && to
        ? { gte: from, lte: to }
        : range
        ? this.getDateRange(range)
        : undefined;

    const createdAtFilter = dateFilter ? { createdAt: dateFilter } : {};

    // ✅ Count data
    const [
      totalUsers,
      totalProfiles,
      totalScans,
      totalCards,
      totalRevenueAgg,
      waitlistUsers,
      activeUsers,
      verifiedUsers,
      pendingProfiles,
      approvedProfiles,
      rejectedProfiles,
      activeCards,
      activeSubscriptions,
    ] = await Promise.all([
      this.prisma.user.count({ where: { ...createdAtFilter } }),
      this.prisma.profile.count({ where: { ...createdAtFilter } }),
      this.prisma.scan.count({ where: { ...createdAtFilter } }),
      this.prisma.qRCard.count({ where: { ...createdAtFilter } }),
      this.prisma.payment.aggregate({
        where: { status: 'completed', ...(createdAtFilter as any) },
        _sum: { amount: true },
      }),
      this.prisma.user.count({ where: { status: UserStatus.WAITLIST, ...createdAtFilter } }),
      this.prisma.user.count({ where: { status: UserStatus.ACTIVE, ...createdAtFilter } }),
      this.prisma.user.count({ where: { status: UserStatus.VERIFIED, ...createdAtFilter } }),
      this.prisma.profile.count({ where: { status: ProfileStatus.PENDING_REVIEW, ...createdAtFilter } }),
      this.prisma.profile.count({ where: { status: ProfileStatus.APPROVED, ...createdAtFilter } }),
      this.prisma.profile.count({ where: { status: ProfileStatus.REJECTED, ...createdAtFilter } }),
      this.prisma.qRCard.count({ where: { isActive: true, ...createdAtFilter } }),
      this.prisma.subscription.count({ where: { status: SubscriptionStatus.ACTIVE, ...createdAtFilter } }),
    ]);

    return {
      overview: {
        totalUsers,
        totalProfiles,
        totalScans,
        totalCards,
        totalRevenue: parseFloat(totalRevenueAgg._sum.amount?.toString() || '0'),
        activeSubscriptions,
      },
      userStatus: {
        waitlist: waitlistUsers,
        active: activeUsers,
        verified: verifiedUsers,
        total: totalUsers,
      },
      profileStatus: {
        pending: pendingProfiles,
        approved: approvedProfiles,
        rejected: rejectedProfiles,
        total: totalProfiles,
      },
      cardStatus: {
        active: activeCards,
        total: totalCards,
      },
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

  // 🔧 DEBUG METHOD - Force submit profile for review
  async forceSubmitForReview(profileId: number) {
    const profile = await this.prisma.profile.findUnique({
      where: { id: profileId },
      include: { user: true },
    });

    if (!profile) {
      throw new HttpException('Profile not found', HttpStatus.NOT_FOUND);
    }

    if (profile.status === ProfileStatus.PENDING_REVIEW) {
      return { message: 'Profile is already pending review', profile };
    }

    if (profile.status === ProfileStatus.APPROVED) {
      return { message: 'Profile is already approved', profile };
    }

    // Force submit for review
    const updatedProfile = await this.prisma.profile.update({
      where: { id: profileId },
      data: { status: ProfileStatus.PENDING_REVIEW },
    });

    return {
      message: `Profile ${profileId} forced to PENDING_REVIEW status`,
      previousStatus: profile.status,
      newStatus: updatedProfile.status,
      profile: updatedProfile
    };
  }

  async findProfileByEmail(email: string) {
    const user = await this.prisma.user.findUnique({
      where: { email },
      include: { profile: true },
    });

    if (!user) {
      throw new HttpException('User not found with this email', HttpStatus.NOT_FOUND);
    }

    if (!user.profile) {
      throw new HttpException('User has no profile', HttpStatus.NOT_FOUND);
    }

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
      profile: {
        id: user.profile.id,
        status: user.profile.status,
        createdAt: user.profile.createdAt,
        updatedAt: user.profile.updatedAt,
      }
    };
  }

  async approveProfile(adminId: number, profileId: number) {
    let profile = await this.prisma.profile.findUnique({
      where: { id: profileId },
      include: { user: true },
    });

    if (!profile) {
      throw new HttpException('Profile not found', HttpStatus.NOT_FOUND);
    }

    // Check if profile is in DRAFT status (ready for approval)
    if (profile.status !== ProfileStatus.DRAFT) {
      const statusMessage = `Profile status is ${profile.status}, expected DRAFT`;
      throw new HttpException(statusMessage, HttpStatus.BAD_REQUEST);
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
    for (let i = 0; i < 1; i++) {
      const uniqueId = randomUUID();
      const card = await this.prisma.qRCard.create({
        data: {
          profileId: profileId,
          userId: profile.userId,
          qrCode: uniqueId,
          scanCount: 0,
          maxScans: 250, // ✅ Fixed: Each card allows 250 total scans from 50+ IPs (5 scans per IP)
          isActive: true,
        },
      });
      qrCards.push(card);
    }

    // Generate tracking number for shipping
    const trackingNumber = `QR-${Date.now()}-${profile.userId}`;

    // Send profile approved email with tracking
    try {
      await this.emailService.sendCustomizableEmail('profile_approved', profile.user.email, {
        userName: profile.user.name || 'User',
        dashboardUrl: `${process.env.FRONTEND_URL || 'https://scanmemaybe.com'}/dashboard`,
        currentYear: new Date().getFullYear().toString(),
      });
    } catch (error) {
      console.error('Failed to send profile approved email:', error);
    }

    // Send password setup email to the user
    try {
      const frontendUrl = process.env.FRONTEND_URL || 'https://scanmemaybe.com';
      const resetLink = `${frontendUrl}/auth/reset-password/${profile.user.email}`;
      
      await this.emailService.sendEmail(
        profile.user.email,
        '🔐 Set Your Password - Registration Approved!',
        `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Set Your Password</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f4f4; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
  <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #f4f4f4; padding: 20px 0;">
    <tr>
      <td align="center" style="padding: 0;">
        <table role="presentation" style="width: 600px; max-width: 100%; border-collapse: collapse; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); overflow: hidden;">
          
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 30px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 600; text-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                🎉 Welcome to Scan Me Maybe!
              </h1>
              <p style="margin: 10px 0 0 0; color: #ffffff; font-size: 14px; opacity: 0.95;">
                Your registration has been approved
              </p>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px 30px;">
              <h2 style="margin: 0 0 15px 0; color: #333333; font-size: 20px; font-weight: 600;">
                Hi ${profile.user.name}! 👋
              </h2>
              
              <p style="margin: 0 0 20px 0; color: #555555; font-size: 16px; line-height: 1.6;">
                Congratulations! Your account has been <strong>approved</strong> by our admin team.
              </p>

              <div style="background-color: #f8f9ff; border-left: 4px solid #667eea; padding: 20px; margin: 25px 0; border-radius: 4px;">
                <p style="margin: 0; color: #333333; font-size: 15px; font-weight: 600;">
                  🔐 Next Step: Set Your Password
                </p>
                <p style="margin: 10px 0 0 0; color: #555555; font-size: 14px; line-height: 1.5;">
                  Click the button below to create your password and access your dashboard.
                </p>
              </div>

              <!-- CTA Button -->
              <table role="presentation" style="width: 100%; margin: 30px 0;">
                <tr>
                  <td align="center">
                    <a href="${resetLink}" 
                       style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                              color: #ffffff; text-decoration: none; padding: 16px 40px; 
                              border-radius: 8px; font-weight: 600; font-size: 16px;
                              box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
                              transition: all 0.3s ease;">
                      🔐 Set Your Password
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Alternative Link -->
              <div style="background-color: #f8f9fa; padding: 15px; border-radius: 6px; margin: 20px 0;">
                <p style="margin: 0 0 8px 0; color: #666666; font-size: 13px; font-weight: 500;">
                  Or copy and paste this link:
                </p>
                <p style="margin: 0; color: #667eea; font-size: 12px; word-break: break-all; font-family: 'Courier New', monospace;">
                  ${resetLink}
                </p>
              </div>

              <!-- Features List -->
              <div style="margin: 30px 0;">
                <p style="margin: 0 0 15px 0; color: #333333; font-size: 15px; font-weight: 600;">
                  ✨ What you can do after setting your password:
                </p>
                <table role="presentation" style="width: 100%;">
                  <tr>
                    <td style="padding: 8px 0;">
                      <span style="color: #667eea; font-size: 16px; margin-right: 8px;">✓</span>
                      <span style="color: #555555; font-size: 14px;">Access your personal dashboard</span>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0;">
                      <span style="color: #667eea; font-size: 16px; margin-right: 8px;">✓</span>
                      <span style="color: #555555; font-size: 14px;">View and manage your QR cards</span>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0;">
                      <span style="color: #667eea; font-size: 16px; margin-right: 8px;">✓</span>
                      <span style="color: #555555; font-size: 14px;">Track scans and view matches</span>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0;">
                      <span style="color: #667eea; font-size: 16px; margin-right: 8px;">✓</span>
                      <span style="color: #555555; font-size: 14px;">Update your profile anytime</span>
                    </td>
                  </tr>
                </table>
              </div>

              <!-- Security Notice -->
              <div style="background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 25px 0; border-radius: 4px;">
                <p style="margin: 0; color: #856404; font-size: 13px; line-height: 1.5;">
                  <strong>🔒 Security Tip:</strong> Create a strong password with at least 8 characters, including uppercase, lowercase, numbers, and special characters.
                </p>
              </div>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f8f9fa; padding: 30px; text-align: center; border-top: 1px solid #e9ecef;">
              <p style="margin: 0 0 10px 0; color: #999999; font-size: 12px; line-height: 1.5;">
                If you didn't register for Scan Me Maybe, please ignore this email.
              </p>
              <p style="margin: 0; color: #999999; font-size: 12px;">
                This is an automated message, please do not reply.
              </p>
              <div style="margin: 20px 0; padding-top: 20px; border-top: 1px solid #e9ecef;">
                <p style="margin: 0; color: #666666; font-size: 12px; font-weight: 500;">
                  © ${new Date().getFullYear()} Scan Me Maybe. All rights reserved.
                </p>
              </div>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
        `,
      );
      console.log(`✅ Password setup email sent to ${profile.user.email}`);
    } catch (error) {
      console.error('Failed to send password setup email:', error);
    }

    // Create notification for user
    await this.prisma.notification.create({
      data: {
        adminId,
        type: 'profile_approved',
        title: 'Profile Approved - Cards Being Printed!',
        message: `Profile approved! 1 QR cards generated and queued for printing. Tracking: ${trackingNumber}`,
        data: { 
          userId: profile.userId, 
          profileId,
          trackingNumber,
          qrCardsGenerated: qrCards.length,
        },
      },
    });

    // ✅ Return success response format that frontend expects
    return {
      success: true,
      message: 'Profile approved successfully!',
      data: {
        ...updatedProfile,
        qrCardsGenerated: qrCards.length,
        trackingNumber,
        user: profile.user,
      },
    };
  }

  async rejectProfile(adminId: number, profileId: number, reason: string) {
    let profile = await this.prisma.profile.findUnique({
      where: { id: profileId },
      include: { user: true },
    });

    if (!profile) {
      throw new HttpException('Profile not found', HttpStatus.NOT_FOUND);
    }

    // Check if profile is in DRAFT status (ready for rejection)
    if (profile.status !== ProfileStatus.DRAFT) {
      const statusMessage = `Profile status is ${profile.status}, expected DRAFT`;
      throw new HttpException(statusMessage, HttpStatus.BAD_REQUEST);
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
    const editLink = `${process.env.FRONTEND_URL || 'https://scanmemaybe.com'}/checkout/setup-profile/edit/${profile.user.email}`;

    // Send profile rejected email with feedback and edit link
    try {
      await this.emailService.sendCustomizableEmail('profile_rejected', profile.user.email, {
        userName: profile.user.name || 'User',
        rejectionReason: reason,
        editProfileUrl: editLink,
        currentYear: new Date().getFullYear().toString(),
      });
    } catch (error) {
      console.error('Failed to send profile rejected email:', error);
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

    // ✅ Return success response format that frontend expects
    return {
      success: true,
      message: 'Profile rejected successfully!',
      data: {
        ...updatedProfile,
        editLink,
        user: profile.user,
      },
    };
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
        'PENDING_REVIEW': ProfileStatus.PENDING_REVIEW,
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
        availableStatuses: ['ALL', 'PENDING', 'PENDING_REVIEW', 'APPROVED', 'REJECTED', 'DRAFT']
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

    // Send registration approved email (non-blocking)
    try {
      await this.emailService.sendCustomizableEmail('registration_approved', user.email, {
        userName: user.name,
        dashboardUrl: process.env.FRONTEND_URL || 'https://scanmemaybe.com',
        // 🚨 BETA TESTING: Direct to profile setup instead of payment
        paymentUrl: `${process.env.FRONTEND_URL || 'https://scanmemaybe.com'}/checkout/setup-profile/${user.email}`,
        paymentButtonText: 'Complete Profile', // Override button text
        currentYear: new Date().getFullYear().toString(),
      });
    } catch (error) {
      console.error('Failed to send registration approved email:', error.message);
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

    // Send registration rejected email
    try {
      await this.emailService.sendCustomizableEmail('registration_rejected', user.email, {
        userName: user.name,
        rejectionReason: reason,
        currentYear: new Date().getFullYear().toString(),
        editProfileUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/profile/edit`,
      });
    } catch (error) {
      console.error('Failed to send registration rejected email:', error.message);
    }

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

  // ================================
  // 👤 ADMIN PROFILE MANAGEMENT
  // ================================

  async getAdminProfile(adminId: number) {
    try {
      const admin = await this.prisma.admin.findUnique({
        where: { id: adminId },
        select: {
          id: true,
          email: true,
          username: true,
          role: true,
          isActive: true,
          lastLogin: true,
          createdAt: true,
          updatedAt: true,
          // Note: password is excluded for security
        }
      });

      if (!admin) {
        throw new HttpException('Admin not found', HttpStatus.NOT_FOUND);
      }

      // Split email to get potential first/last name if stored as full name
      const [firstName = '', lastName = ''] = admin.username?.split(' ') || ['', ''];

      return {
        ...admin,
        firstName,
        lastName,
        phoneNumber: '', // Add phone field to admin schema if needed
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        `Failed to fetch admin profile: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  async updateAdminProfile(adminId: number, updateData: {
    userName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
    username?: string;
  }) {
    try {
      // Check if admin exists
      const existingAdmin = await this.prisma.admin.findUnique({
        where: { id: adminId }
      });

      if (!existingAdmin) {
        throw new HttpException('Admin not found', HttpStatus.NOT_FOUND);
      }

      // Check if email is being updated and if it's already taken
      if (updateData.email && updateData.email !== existingAdmin.email) {
        const emailExists = await this.prisma.admin.findFirst({
          where: { 
            email: updateData.email,
            id: { not: adminId }
          }
        });

        if (emailExists) {
          throw new HttpException('Email already in use', HttpStatus.CONFLICT);
        }
      }

      // Check if username is being updated and if it's already taken
      if (updateData.username && updateData.username !== existingAdmin.username) {
        const usernameExists = await this.prisma.admin.findFirst({
          where: { 
            username: updateData.username,
            id: { not: adminId }
          }
        });

        if (usernameExists) {
          throw new HttpException('Username already in use', HttpStatus.CONFLICT);
        }
      }

      // Prepare update data
      const updatePayload: any = {};
      
      if (updateData.email) {
        updatePayload.email = updateData.email;
      }

      if (updateData.username) {
        updatePayload.username = updateData.username;
      }

      // If firstName and lastName are provided, combine them for username if username not explicitly set
      if (updateData.userName && updateData.lastName && !updateData.username) {
        const fullName = `${updateData.userName} ${updateData.lastName}`.trim();
        if (fullName && fullName !== existingAdmin.username) {
          // Check if this combined name is available
          const nameExists = await this.prisma.admin.findFirst({
            where: { 
              username: fullName,
              id: { not: adminId }
            }
          });

          if (!nameExists) {
            updatePayload.username = fullName;
          }
        }
      }

      // Update admin profile
      const updatedAdmin = await this.prisma.admin.update({
        where: { id: adminId },
        data: {
          ...updatePayload,
          updatedAt: new Date(),
        },
        select: {
          id: true,
          email: true,
          username: true,
          role: true,
          isActive: true,
          lastLogin: true,
          createdAt: true,
          updatedAt: true,
        }
      });

      // Return updated profile with split name fields
      const [userName = '', lastName = ''] = updatedAdmin.username?.split(' ') || ['', ''];

      return {
        success: true,
        message: 'Admin profile updated successfully',
        admin: {
          ...updatedAdmin,
          userName,
          lastName,
          phone: updateData.phone || '', // Store in admin table if needed
        }
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        `Failed to update admin profile: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  async changeAdminPassword(adminId: number, passwordData: {
    oldPassword: string;
    newPassword: string;
    confirmPassword: string;
  }) {
    try {
      const bcrypt = require('bcryptjs');

      // Validate password confirmation
      if (passwordData.newPassword !== passwordData.confirmPassword) {
        throw new HttpException('New password and confirmation do not match', HttpStatus.BAD_REQUEST);
      }

      // Get admin with password
      const admin = await this.prisma.admin.findUnique({
        where: { id: adminId }
      });

      if (!admin) {
        throw new HttpException('Admin not found', HttpStatus.NOT_FOUND);
      }

      // Verify old password
      const isOldPasswordValid = await bcrypt.compare(passwordData.oldPassword, admin.password);
      if (!isOldPasswordValid) {
        throw new HttpException('Current password is incorrect', HttpStatus.UNAUTHORIZED);
      }

      // Check if new password is different from old password
      const isSamePassword = await bcrypt.compare(passwordData.newPassword, admin.password);
      if (isSamePassword) {
        throw new HttpException('New password must be different from current password', HttpStatus.BAD_REQUEST);
      }

      // Hash new password
      const saltRounds = 12;
      const hashedNewPassword = await bcrypt.hash(passwordData.newPassword, saltRounds);

      // Update password
      await this.prisma.admin.update({
        where: { id: adminId },
        data: { 
          password: hashedNewPassword,
          updatedAt: new Date(),
        }
      });

      return {
        success: true,
        message: 'Password changed successfully',
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        `Failed to change password: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  // ========================
  // Enhanced Email Template Management
  // ========================

  async initializeCustomizableTemplates() {
    return await this.emailService.initializeCustomizableTemplates();
  }

  async getCustomizableTemplates() {
    try {
      const templates = await this.prisma.emailTemplate.findMany({
        orderBy: {
          name: 'asc'
        }
      });
      return {
        success: true,
        data: templates,
        count: templates.length
      };
    } catch (error) {
      console.error('Error fetching email templates:', error);
      throw new HttpException(
        `Failed to fetch templates: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  async getCustomizableTemplate(name: string) {
    try {
      const template = await this.prisma.emailTemplate.findUnique({
        where: { name }
      });
      
      if (!template) {
        throw new HttpException(
          `Template '${name}' not found`,
          HttpStatus.NOT_FOUND
        );
      }
      
      if (!template) {
        throw new HttpException(
          `Template '${name}' not found`,
          HttpStatus.NOT_FOUND
        );
      }

      return {
        success: true,
        data: template
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      console.error('Error fetching email template:', error);
      throw new HttpException(
        `Failed to fetch template: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  async createEmailTemplate(templateData: any) {
    try {
      const { name, subject, body, html_template, components, settings, variables, preheader } = templateData;
      
      // Check if template already exists
      const existingTemplate = await this.prisma.emailTemplate.findUnique({
        where: { name }
      });
      
      if (existingTemplate) {
        throw new HttpException(
          `Template '${name}' already exists`,
          HttpStatus.CONFLICT
        );
      }

      const newTemplate = await this.prisma.emailTemplate.create({
        data: {
          name,
          subject,
          body,
          htmlTemplate: html_template,
          components: components || {},
          settings: settings || {},
          variables: variables || {},
          preheader: preheader || '',
          isActive: true
        }
      });

      return {
        success: true,
        message: `Template '${name}' created successfully`,
        data: newTemplate,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      console.error('Error creating email template:', error);
      throw new HttpException(
        `Failed to create template: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  async updateEmailTemplate(name: string, templateData: any) {
    try {
      const { subject, body, html_template, components, settings, variables, preheader } = templateData;
      
      // Check if template exists
      const existingTemplate = await this.prisma.emailTemplate.findUnique({
        where: { name }
      });

      if (!existingTemplate) {
        throw new HttpException(
          `Template '${name}' not found`,
          HttpStatus.NOT_FOUND
        );
      }

      const updatedTemplate = await this.prisma.emailTemplate.update({
        where: { name },
        data: {
          subject,
          body,
          htmlTemplate: html_template,
          components: components || {},
          settings: settings || {},
          variables: variables || {},
          preheader: preheader || existingTemplate.preheader
        }
      });

      return {
        success: true,
        message: `Template '${name}' updated successfully`,
        data: updatedTemplate,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      console.error('Error updating email template:', error);
      throw new HttpException(
        `Failed to update template: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  async deleteEmailTemplate(name: string) {
    try {
      const template = await this.prisma.emailTemplate.findUnique({
        where: { name }
      });
      
      if (!template) {
        throw new HttpException(
          `Template '${name}' not found`,
          HttpStatus.NOT_FOUND
        );
      }

      await this.prisma.emailTemplate.delete({
        where: { name }
      });

      return {
        success: true,
        message: `Template '${name}' deleted successfully`,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      console.error('Error deleting email template:', error);
      throw new HttpException(
        `Failed to delete template: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  async sendTestEmail(templateName: string, email: string, variables: any = {}) {
    try {
      const template = await this.emailService.getCustomizableTemplate(templateName);
      if (!template) {
        throw new HttpException(
          `Template '${templateName}' not found`,
          HttpStatus.NOT_FOUND
        );
      }

      // Add test indicator variables
      const testVariables = {
        ...variables,
        userName: variables.userName || 'Test User',
        userEmail: email,
        isTestEmail: true,
        testMessage: '[TEST EMAIL] This is a test email sent from admin dashboard'
      };

      await this.emailService.sendCustomizableEmail(templateName, email, testVariables);

      return {
        success: true,
        message: `Test email sent to ${email} using template '${templateName}'`,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        `Failed to send test email: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  async previewEmailTemplate(templateName: string, variables: any = {}) {
    try {
      const template = await this.emailService.getCustomizableTemplate(templateName);
      if (!template) {
        throw new HttpException(
          `Template '${templateName}' not found`,
          HttpStatus.NOT_FOUND
        );
      }

      // Generate preview with sample variables
      const previewVariables = {
        userName: 'John Doe',
        userEmail: 'john.doe@example.com',
        currentYear: new Date().getFullYear().toString(),
        appName: 'QR Dating App',
        ...variables
      };

      // Process template with variables (simplified version)
      let processedHtml = template.html_template || template.htmlTemplate || '';
      let processedSubject = template.subject;

      // Decode HTML entities for curly braces BEFORE replacing variables
      const preDecode = (html: string) => {
        html = html
          .replace(/&#123;/g, '{')
          .replace(/&#125;/g, '}')
          .replace(/&amp;#123;/g, '{')
          .replace(/&amp;#125;/g, '}')
          .replace(/%7B/gi, '{')
          .replace(/%7D/gi, '}')
          .replace(/%257B/gi, '{')
          .replace(/%257D/gi, '}');
        return html;
      };
      processedHtml = preDecode(processedHtml);
      processedSubject = preDecode(processedSubject);

      // Replace variables in HTML and subject
      Object.entries(previewVariables).forEach(([key, value]) => {
        const regex = new RegExp(`{{${key}}}`, 'g');
        processedHtml = processedHtml.replace(regex, String(value));
        processedSubject = processedSubject.replace(regex, String(value));
      });

      return {
        success: true,
        data: {
          subject: processedSubject,
          html: processedHtml,
          variables: previewVariables
        },
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        `Failed to preview template: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  async duplicateEmailTemplate(sourceTemplateName: string, newTemplateName: string) {
    try {
      const sourceTemplate = await this.prisma.emailTemplate.findUnique({
        where: { name: sourceTemplateName }
      });
      
      if (!sourceTemplate) {
        throw new HttpException(
          `Source template '${sourceTemplateName}' not found`,
          HttpStatus.NOT_FOUND
        );
      }

      // Check if new template name already exists
      const existingTemplate = await this.prisma.emailTemplate.findUnique({
        where: { name: newTemplateName }
      });

      if (existingTemplate) {
        throw new HttpException(
          `Template '${newTemplateName}' already exists`,
          HttpStatus.CONFLICT
        );
      }

      // Create new template with copied data
      const newTemplate = await this.prisma.emailTemplate.create({
        data: {
          name: newTemplateName,
          subject: `Copy of ${sourceTemplate.subject}`,
          body: sourceTemplate.body,
          htmlTemplate: sourceTemplate.htmlTemplate,
          components: sourceTemplate.components || {},
          settings: sourceTemplate.settings || {},
          variables: sourceTemplate.variables || {},
          preheader: sourceTemplate.preheader,
          isActive: true
        }
      });

      return {
        success: true,
        message: `Template duplicated successfully as '${newTemplateName}'`,
        data: newTemplate,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      console.error('Error duplicating email template:', error);
      throw new HttpException(
        `Failed to duplicate template: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  async getEmailVariables() {
    try {
      return {
        success: true,
        data: {
          global: [
            { key: 'userName', description: 'User\'s full name', example: 'John Doe' },
            { key: 'userEmail', description: 'User\'s email address', example: 'john@example.com' },
            { key: 'currentYear', description: 'Current year', example: '2025' },
            { key: 'appName', description: 'Application name', example: 'QR Dating App' }
          ],
          authentication: [
            { key: 'loginUrl', description: 'Login page URL', example: 'https://app.com/login' },
            { key: 'dashboardUrl', description: 'Dashboard URL', example: 'https://app.com/dashboard' }
          ],
          profile: [
            { key: 'editProfileUrl', description: 'Profile editing URL', example: 'https://app.com/profile/edit' },
            { key: 'rejectionReason', description: 'Reason for profile rejection', example: 'Please update your photos' }
          ],
          payment: [
            { key: 'paymentUrl', description: 'Payment/checkout URL', example: 'https://app.com/checkout' },
            { key: 'checkoutUrl', description: 'Checkout page URL', example: 'https://app.com/checkout' }
          ],
          buttons: [
            { key: 'paymentButtonText', description: 'Payment button text', example: '💳 Complete Payment →' },
            { key: 'dashboardButtonText', description: 'Dashboard button text', example: '🎯 Go to Dashboard →' },
            { key: 'editButtonText', description: 'Edit profile button text', example: '✏️ Edit Profile →' },
            { key: 'loginButtonText', description: 'Login button text', example: '🔐 Login →' }
          ]
        }
      };
    } catch (error) {
      throw new HttpException(
        `Failed to get email variables: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  // ========================
  // Email Button Configuration Management
  // ========================

  async getEmailButtonConfigurations() {
    try {
      // Return default button text configurations that can be customized
      return {
        success: true,
        data: {
          paymentButtonText: 'Complete Payment & Setup →',
          dashboardButtonText: 'Generate QR Cards →',
          editButtonText: 'Edit Profile →',
          loginButtonText: 'Login to Dashboard →',
          
          // Static URLs (not customizable for security)
          staticUrls: {
            dashboardUrl: 'Auto-generated based on frontend URL',
            editProfileUrl: 'Auto-generated based on frontend URL', 
            paymentUrl: 'Auto-generated based on frontend URL',
            loginUrl: 'Auto-generated based on frontend URL'
          },
          
          note: 'Button text can be customized by updating the template variables. URLs are automatically generated for security.'
        }
      };
    } catch (error) {
      throw new HttpException(
        `Failed to get button configurations: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  async updateTemplateWithButtonText(templateName: string, buttonConfigs: {
    paymentButtonText?: string;
    dashboardButtonText?: string;
    editButtonText?: string;
    loginButtonText?: string;
  }) {
    try {
      const template = await this.emailService.getCustomizableTemplate(templateName);
      if (!template) {
        throw new HttpException(`Template '${templateName}' not found`, HttpStatus.NOT_FOUND);
      }

      let htmlTemplate = template.html_template || template.htmlTemplate || '';
      
      // Validate that we're not accidentally removing placeholder variables
      const originalVariables = htmlTemplate.match(/{{[^}]+}}/g) || [];
      
      // Instead of replacing variables, we store the button text as metadata
      // and let the email service use them as default values
      const updatedConfigs = {
        ...buttonConfigs,
        templateName,
        lastUpdated: new Date().toISOString()
      };

      // For now, we'll add a comment in the template to track custom button text
      const configComment = `<!-- Custom Button Config: ${JSON.stringify(buttonConfigs)} -->`;
      
      if (!htmlTemplate.includes('<!-- Custom Button Config:')) {
        htmlTemplate = configComment + '\n' + htmlTemplate;
      } else {
        // Replace existing config comment
        htmlTemplate = htmlTemplate.replace(/<!-- Custom Button Config:.*?-->/s, configComment);
      }

      // Update the template in database
      await this.updateEmailTemplate(templateName, {
        subject: template.subject,
        body: template.body,
        html_template: htmlTemplate,
        components: [],
        settings: {},
        variables: []
      });

      return {
        success: true,
        message: `Button text preferences saved for template '${templateName}'. Note: Button text is applied when emails are sent, not stored in template.`,
        updatedConfigs: buttonConfigs,
        note: 'Button text variables remain as {{buttonText}} placeholders and are replaced during email sending',
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        `Failed to update button text: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  // Helper method to extract button configs from template comments
  getButtonConfigFromTemplate(htmlTemplate: string): any {
    const match = htmlTemplate.match(/<!-- Custom Button Config: (.*?) -->/s);
    if (match) {
      try {
        return JSON.parse(match[1]);
      } catch (e) {
        return {};
      }
    }
    return {};
  }

  // ========================
  // Add Dummy User Feature
  // ========================
  async createDummyUser(data: {
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
  }) {
    try {
      // Check if user already exists
      const existingUser = await this.prisma.user.findUnique({
        where: { email: data.email },
      });

      if (existingUser) {
        throw new HttpException(
          'User with this email already exists',
          HttpStatus.BAD_REQUEST
        );
      }

      // Create user with ACTIVE status and all approvals
      const user = await this.prisma.user.create({
        data: {
          email: data.email,
          name: data.name,
          phone: data.phone,
          status: UserStatus.VERIFIED, // Set to VERIFIED so it appears in User Edit
          isApproved: true, // Mark as approved
          approvedAt: new Date(), // Set approval timestamp
          paidSetupFee: true, // Mark setup fee as paid
        },
      });


      // Create profile with APPROVED status and dummy data
      const profile = await this.prisma.profile.create({
        data: {
          userId: user.id,
          age: String(data.age),
          birthMonth: data.birthMonth,
          birthYear: data.birthYear,
          height: data.height,
          bodyType: data.bodyType,
          dealbreakers: data.dealbreakers,
          bio: data.bio,
          area: data.area || null,
          county: data.county || null,
          location: data.location,
          image: data.images,
          displayName: data.name,
          email: data.email,
          phone: data.phone,
          status: ProfileStatus.APPROVED,
          isActive: true,
        },
      });

      // Create active subscription (dummy payment)
      const subscription = await this.prisma.subscription.create({
        data: {
          userId: user.id,
          plan: SubscriptionPlan.MONTHLY,
          status: SubscriptionStatus.ACTIVE,
          amount: 69.00,
          currency: 'USD',
          startDate: new Date(),
          endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year from now
          stripeSubscriptionId: `dummy_${randomUUID()}`,
          stripeCustomerId: `dummy_cus_${randomUUID()}`,
        },
      });

      // Generate 1 QR card for the user (following approveProfile logic)
      const qrCards: any[] = [];
      for (let i = 0; i < 1; i++) {
        const uniqueId = randomUUID();
        const card = await this.prisma.qRCard.create({
          data: {
            profileId: profile.id,
            userId: user.id,
            qrCode: uniqueId,
            scanCount: 0,
            maxScans: 250, // ✅ Fixed: Each card allows 250 total scans from 50+ IPs (5 scans per IP)
            isActive: true,
          },
        });
        qrCards.push(card);
      }

      // Send welcome email
      try {
        await this.emailService.sendCustomizableEmail(
          'registration_approved',
          user.email,
          {
            userName: user.name,
            userEmail: user.email,
            paymentUrl: `${process.env.FRONTEND_URL}/dashboard`,
          }
        );
      } catch (emailError) {
        console.error('Failed to send welcome email:', emailError.message);
        // Don't fail the user creation if email fails
      }

      return {
        success: true,
        message: 'Dummy user created successfully',
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          status: user.status,
        },
        profile: {
          id: profile.id,
          status: profile.status,
          age: profile.age,
          location: profile.location,
          isActive: profile.isActive,
        },
        subscription: {
          id: subscription.id,
          plan: subscription.plan,
          status: subscription.status,
          endDate: subscription.endDate,
        },
        qrCardsGenerated: qrCards.length,
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        `Failed to create dummy user: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
}
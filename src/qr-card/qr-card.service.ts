import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { EmailService } from '../email/email.service';
import * as QRCode from 'qrcode';
import { randomUUID } from 'crypto';

@Injectable()
export class QRCardService {
  constructor(
    private prisma: PrismaService,
    private emailService: EmailService
  ) {}

  async generateQRCards(userId: number, count: number = 1) {
    // Check if user has approved profile
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { profile: true },
    });

    if (!user) {
      throw new HttpException('User not found', HttpStatus.NOT_FOUND);
    }

    if (!user.profile || user.profile.status !== 'APPROVED') {
      throw new HttpException('Profile must be approved before generating QR cards', HttpStatus.BAD_REQUEST);
    }

    const cards: any[] = [];
    
    for (let i = 0; i < count; i++) {
      const uniqueId = randomUUID();
      const qrData = `${process.env.FRONTEND_URL || 'https://scanmemaybe.com'}/scan/${uniqueId}`;
      
      // Generate QR code as data URL
      const qrCodeDataUrl = await QRCode.toDataURL(qrData);

      const card = await this.prisma.qRCard.create({
        data: {
          profileId: user.profile.id,
          userId: userId,
          qrCode: uniqueId,
          scanCount: 0,
          maxScans: 250,
          isActive: true,
        },
      });

      cards.push({
        ...card,
        qrCodeImage: qrCodeDataUrl,
        scanUrl: qrData,
      });
    }

    // Create notification for admin about QR card generation
    await this.prisma.notification.create({
      data: {
        adminId: 1, // Default admin ID
        type: 'qr_cards_generated',
        title: 'QR Cards Generated',
        message: `User generated ${count} QR cards (User ID: ${userId})`,
        data: {
          userId,
          cardCount: count,
          profileId: user.profile.id,
        },
      },
    });

    return {
      message: `Generated ${count} QR cards`,
      cards,
    };
  }

  async scanQRCard(qrCode: string, viewerInfo: { ipAddress?: string; userAgent?: string; viewerId?: number; scannerEmail?: string }) {
    // Find the QR card
    const card = await this.prisma.qRCard.findUnique({
      where: { qrCode },
      include: {
        profile: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
    });

    if (!card) {
      throw new HttpException('Invalid QR code', HttpStatus.NOT_FOUND);
    }

    if (!card.isActive) {
      throw new HttpException('This QR card is no longer active', HttpStatus.BAD_REQUEST);
    }

    console.log(`[QR Scan Start] Card: ${qrCode}, Current Total Scans: ${card.scanCount}/${card.maxScans}, IP: ${viewerInfo.ipAddress}`);

    // Check if card has reached maximum total scans (250)
    if (card.scanCount >= card.maxScans) {
      // Get unique IP count to show how many different IPs have scanned
      const uniqueIpCount = await this.prisma.scan.groupBy({
        by: ['ipAddress'],
        where: { qrCardId: card.id },
        _count: true,
      });

      return {
        success: false,
        message: `This card has reached its maximum scan limit (${card.maxScans} scans total). The card has been scanned by ${uniqueIpCount.length} different IP addresses.`,
        limitReached: true,
        totalScans: card.scanCount,
        maxScans: card.maxScans,
        uniqueIPs: uniqueIpCount.length,
      };
    }

    // Check IP-based scan limit (max 5 scans per IP address per card)
    // Allow scans when count is 0,1,2,3,4 (total 5 scans), block when count >= 5
    if (viewerInfo.ipAddress) {
      const ipScanCount = await this.prisma.scan.count({
        where: {
          qrCardId: card.id,
          ipAddress: viewerInfo.ipAddress,
        },
      });

      console.log(`[QR Scan] Card: ${qrCode}, IP: ${viewerInfo.ipAddress}, Previous IP Scan Count: ${ipScanCount}/5, Total Card Scans: ${card.scanCount}/${card.maxScans}`);

      // Block if this IP has already scanned 5 times (count would be 5 or more)
      if (ipScanCount >= 5) {
        return {
          success: false,
          message: `This IP address has already scanned this card the maximum 5 times. Each IP can scan up to 5 times. Try from a different network.`,
          ipLimitReached: true,
          scansFromThisIP: ipScanCount,
          totalCardScans: card.scanCount,
          maxScans: card.maxScans,
        };
      }
    } else {
      console.warn(`[QR Scan] Warning: No IP address captured for scan of card ${qrCode}`);
    }

    // Record the scan
    const scan = await this.prisma.scan.create({
      data: {
        qrCardId: card.id,
        viewerId: viewerInfo.viewerId,
        ipAddress: viewerInfo.ipAddress,
        userAgent: viewerInfo.userAgent,
      },
    });

    // Update scan count
    const updatedCard = await this.prisma.qRCard.update({
      where: { id: card.id },
      data: { scanCount: card.scanCount + 1 },
    });

    // Get updated IP scan count for this IP
    const updatedIpScanCount = viewerInfo.ipAddress ? await this.prisma.scan.count({
      where: {
        qrCardId: card.id,
        ipAddress: viewerInfo.ipAddress,
      },
    }) : 0;

    // Send email notification to both profile owner and scanner (if email provided)
    const profileOwnerEmail = card.profile.user.email;
    const profileOwnerName = card.profile.user.name;
    const scannerEmail = viewerInfo.scannerEmail;
    
    try {
      // Send notification to profile owner about the scan
      await this.emailService.sendQRCodeScanned(
        profileOwnerEmail,
        profileOwnerName,
        {
          scanDate: new Date().toISOString(),
          scanLocation: viewerInfo.ipAddress || 'Unknown',
          scansRemaining: card.maxScans - (card.scanCount + 1),
          scannerEmail: scannerEmail || 'Anonymous'
        }
      );

      // If scanner provided email, send them the profile information
      if (scannerEmail) {
        await this.emailService.sendProfileInfo(
          scannerEmail,
          profileOwnerName,
          {
            name: card.profile.user.name,
            age: Number(card.profile.age || 0),
            bio: card.profile.bio || 'No bio available',
            location: card.profile.location || 'Location not specified',
            contactEmail: profileOwnerEmail
          }
        );
      }
    } catch (emailError) {
      console.error('Failed to send email notifications:', emailError);
      // Continue with the response even if email fails
    }

    // Return profile information (without sensitive data)
    const response = {
      success: true,
      profile: {
        id: card.profile.id,
        name: card.profile.user.name,
        age: card.profile.age,
        bio: card.profile.bio,
        location: card.profile.location,
        images: card.profile.image || [], 
        contactEmail: profileOwnerEmail,
      },
      scanId: scan.id,
      scansRemaining: updatedCard.maxScans - updatedCard.scanCount,
      totalScans: updatedCard.scanCount,
      maxScans: updatedCard.maxScans,
      ipScansRemaining: viewerInfo.ipAddress ? 5 - updatedIpScanCount : null,
      ipScansUsed: updatedIpScanCount,
      yourIpAddress: viewerInfo.ipAddress ? `${viewerInfo.ipAddress.substring(0, 10)}...` : 'Unknown',
      emailNotifications: {
        profileOwnerNotified: true,
        scannerNotified: !!scannerEmail
      }
    };

    console.log(`[QR Scan Success] Returning response:`, {
      scansRemaining: response.scansRemaining,
      totalScans: response.totalScans,
      maxScans: response.maxScans,
      ipScansUsed: response.ipScansUsed,
      ipScansRemaining: response.ipScansRemaining
    });

    return response;
  }  async getUserCards(userId: number) {
    const cards = await this.prisma.qRCard.findMany({
      where: { userId },
      include: {
        scans: {
          select: {
            id: true,
            createdAt: true,
            ipAddress: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return cards.map(card => ({
      ...card,
      scanUrl: `${process.env.FRONTEND_URL || 'https://scanmemaybe.com'}/scan/${card.qrCode}`,
    }));
  }

  async deactivateCard(userId: number, cardId: number) {
    const card = await this.prisma.qRCard.findFirst({
      where: { id: cardId, userId },
    });

    if (!card) {
      throw new HttpException('Card not found', HttpStatus.NOT_FOUND);
    }

    return this.prisma.qRCard.update({
      where: { id: cardId },
      data: { isActive: false },
    });
  }

  async getCardScans(userId: number, cardId: number) {
    const card = await this.prisma.qRCard.findFirst({
      where: { id: cardId, userId },
      include: {
        scans: {
          include: {
            viewer: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!card) {
      throw new HttpException('Card not found', HttpStatus.NOT_FOUND);
    }

    return card.scans;
  }

  // Email-based QR card generation - No approval required for testing
  async generateQRCardsByEmail(email: string, count: number = 1) {
    // Find user by email
    const user = await this.prisma.user.findUnique({
      where: { email },
      include: { profile: true },
    });

    if (!user) {
      throw new HttpException('User not found with this email', HttpStatus.NOT_FOUND);
    }

    if (!user.profile) {
      throw new HttpException('Profile must be created before generating QR cards', HttpStatus.BAD_REQUEST);
    }

    // For testing purposes, allow QR generation even without approval
    // In production, you might want to enforce approval
    
    const cards: any[] = [];
    
    for (let i = 0; i < count; i++) {
      const uniqueId = randomUUID();
      const qrData = `${process.env.FRONTEND_URL || 'https://scanmemaybe.com'}/scan/${uniqueId}`;
      
      // Generate QR code as data URL
      const qrCodeDataUrl = await QRCode.toDataURL(qrData);

      const card = await this.prisma.qRCard.create({
        data: {
          profileId: user.profile.id,
          userId: user.id,
          qrCode: uniqueId,
          scanCount: 0,
          maxScans: 250,
          isActive: true,
        },
      });

      cards.push({
        ...card,
        qrCodeImage: qrCodeDataUrl,
        scanUrl: qrData,
      });
    }

    // Create notification for admin about QR card generation by email
    await this.prisma.notification.create({
      data: {
        adminId: 1, // Default admin ID
        type: 'qr_cards_generated_email',
        title: 'QR Cards Generated (Email)',
        message: `${user.name} (${email}) generated ${count} QR cards via email`,
        data: {
          userId: user.id,
          email: user.email,
          name: user.name,
          cardCount: count,
          profileId: user.profile.id,
        },
      },
    });

    return {
      success: true,
      message: `Generated ${count} QR cards successfully`,
      cards,
      user: {
        email: user.email,
        name: user.name,
      },
      profile: {
        id: user.profile.id,
        status: user.profile.status,
      },
    };
  }

  // Email-based QR cards retrieval
  async getUserCardsByEmail(email: string) {
    const user = await this.prisma.user.findUnique({
      where: { email },
      include: { profile: true },
    });

    if (!user) {
      throw new HttpException('User not found with this email', HttpStatus.NOT_FOUND);
    }

    const cards = await this.prisma.qRCard.findMany({
      where: { userId: user.id },
      include: {
        profile: {
          include: {
            user: true,
          },
        },
        scans: {
          orderBy: {
            createdAt: 'desc',
          },
          take: 5, // Show last 5 scans per card
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return {
      success: true,
      totalCards: cards.length,
      cards: cards.map(card => ({
        ...card,
        scansRemaining: card.maxScans - card.scanCount,
        scanUrl: `${process.env.FRONTEND_URL || 'https://scanmemaybe.com'}/scan/${card.qrCode}`,
      })),
      user: {
        email: user.email,
        name: user.name,
      },
    };
  }

  // Get all QR cards in the system (for admin purposes)
  async getAllQRCards() {
    const cards = await this.prisma.qRCard.findMany({
      include: {
        profile: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return {
      success: true,
      totalCards: cards.length,
      cards: cards.map(card => ({
        ...card,
        scansRemaining: card.maxScans - card.scanCount,
        scanUrl: `${process.env.FRONTEND_URL || 'https://scanmemaybe.com'}/scan/${card.qrCode}`,
        owner: {
          name: card.profile?.user?.name || 'Unknown',
          email: card.profile?.user?.email || 'Unknown',
        },
      })),
    };
  }

  // Get QR cards with pagination
  async getPaginatedQRCards(page: number = 1, limit: number = 10) {
    const skip = (page - 1) * limit;
    
    const [cards, totalCount] = await Promise.all([
      this.prisma.qRCard.findMany({
        skip,
        take: limit,
        include: {
          profile: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      }),
      this.prisma.qRCard.count(),
    ]);

    return {
      success: true,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
        hasNext: page * limit < totalCount,
        hasPrev: page > 1,
      },
      cards: cards.map(card => ({
        ...card,
        scansRemaining: card.maxScans - card.scanCount,
        scanUrl: `${process.env.FRONTEND_URL || 'https://scanmemaybe.com'}/scan/${card.qrCode}`,
        owner: {
          name: card.profile?.user?.name || 'Unknown',
          email: card.profile?.user?.email || 'Unknown',
        },
      })),
    };
  }

  // Get only active QR cards
  async getActiveQRCards() {
    const cards = await this.prisma.qRCard.findMany({
      where: {
        isActive: true,
        scanCount: {
          lt: 5, // maxScans default value
        },
      },
      include: {
        profile: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return {
      success: true,
      totalActiveCards: cards.length,
      cards: cards.map(card => ({
        ...card,
        scansRemaining: card.maxScans - card.scanCount,
        scanUrl: `${process.env.FRONTEND_URL || 'https://scanmemaybe.com'}/scan/${card.qrCode}`,
        owner: {
          name: card.profile?.user?.name || 'Unknown',
          email: card.profile?.user?.email || 'Unknown',
        },
      })),
    };
  }

  // Method to check scan limits for a specific QR code and IP address
  async checkScanLimits(qrCode: string, ipAddress?: string) {
    const card = await this.prisma.qRCard.findUnique({
      where: { qrCode },
      include: {
        profile: {
          include: {
            user: {
              select: {
                name: true,
                email: true,
              },
            },
          },
        },
      },
    });

    if (!card) {
      throw new HttpException('QR card not found', HttpStatus.NOT_FOUND);
    }

    let ipScanCount = 0;
    if (ipAddress) {
      ipScanCount = await this.prisma.scan.count({
        where: {
          qrCardId: card.id,
          ipAddress: ipAddress,
        },
      });
    }

    return {
      qrCode: card.qrCode,
      totalScans: card.scanCount,
      maxTotalScans: card.maxScans,
      scansRemaining: card.maxScans - card.scanCount,
      ipAddress: ipAddress || 'Not provided',
      scansFromThisIP: ipScanCount,
      ipScansRemaining: Math.max(0, 5 - ipScanCount),
      canScan: card.isActive && card.scanCount < card.maxScans && ipScanCount < 5,
      limitReasons: {
        totalLimitReached: card.scanCount >= card.maxScans,
        ipLimitReached: ipScanCount >= 5,
        cardInactive: !card.isActive,
      },
      owner: {
        name: card.profile.user.name,
        email: card.profile.user.email,
      },
    };
  }

  // Get detailed debug information about a card
  async getCardDebugInfo(qrCode: string) {
    const card = await this.prisma.qRCard.findUnique({
      where: { qrCode },
      include: {
        profile: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
        scans: {
          select: {
            id: true,
            ipAddress: true,
            createdAt: true,
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
    });

    if (!card) {
      throw new HttpException('QR card not found', HttpStatus.NOT_FOUND);
    }

    // Group scans by IP address
    const ipGroups = await this.prisma.scan.groupBy({
      by: ['ipAddress'],
      where: { qrCardId: card.id },
      _count: true,
    });

    const ipDetails = ipGroups.map(group => ({
      ip: group.ipAddress || 'Unknown',
      scanCount: group._count,
      canScanMore: group._count < 5,
      scansRemaining: Math.max(0, 5 - group._count),
    }));

    return {
      cardInfo: {
        qrCode: card.qrCode,
        isActive: card.isActive,
        totalScans: card.scanCount,
        maxScans: card.maxScans,
        scansRemaining: card.maxScans - card.scanCount,
        percentageUsed: ((card.scanCount / card.maxScans) * 100).toFixed(2) + '%',
      },
      ipStatistics: {
        uniqueIPs: ipGroups.length,
        minUniqueIPsNeeded: 50,
        ipDetails: ipDetails,
      },
      owner: {
        name: card.profile.user.name,
        email: card.profile.user.email,
      },
      recentScans: card.scans.slice(0, 10).map(scan => ({
        id: scan.id,
        ip: scan.ipAddress || 'Unknown',
        timestamp: scan.createdAt,
      })),
      limits: {
        totalLimit: `${card.scanCount}/${card.maxScans} scans used`,
        totalLimitReached: card.scanCount >= card.maxScans,
        expectedMinimumIPs: 50,
        currentUniqueIPs: ipGroups.length,
      },
    };
  }
}
import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import * as QRCode from 'qrcode';
import { randomUUID } from 'crypto';

@Injectable()
export class QRCardService {
  constructor(private prisma: PrismaService) {}

  async generateQRCards(userId: number, count: number = 50) {
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
      const qrData = `${process.env.FRONTEND_URL || 'https://yourapp.com'}/scan/${uniqueId}`;
      
      // Generate QR code as data URL
      const qrCodeDataUrl = await QRCode.toDataURL(qrData);

      const card = await this.prisma.qRCard.create({
        data: {
          profileId: user.profile.id,
          userId: userId,
          qrCode: uniqueId,
          scanCount: 0,
          maxScans: 5,
          isActive: true,
        },
      });

      cards.push({
        ...card,
        qrCodeImage: qrCodeDataUrl,
        scanUrl: qrData,
      });
    }

    return {
      message: `Generated ${count} QR cards`,
      cards,
    };
  }

  async scanQRCard(qrCode: string, viewerInfo: { ipAddress?: string; userAgent?: string; viewerId?: number }) {
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

    if (card.scanCount >= card.maxScans) {
      return {
        success: false,
        message: 'This card has been used 5 times and is no longer available',
        limitReached: true,
      };
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
    await this.prisma.qRCard.update({
      where: { id: card.id },
      data: { scanCount: card.scanCount + 1 },
    });

    // Return profile information (without sensitive data)
    return {
      success: true,
      profile: {
        id: card.profile.id,
        name: card.profile.user.name,
        age: card.profile.age,
        bio: card.profile.bio,
        location: card.profile.location,
        photos: card.profile.photos,
        facePhoto: card.profile.facePhoto,
        fullBodyPhoto: card.profile.fullBodyPhoto,
      },
      scanId: scan.id,
      scansRemaining: card.maxScans - (card.scanCount + 1),
    };
  }

  async getUserCards(userId: number) {
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
      scanUrl: `${process.env.FRONTEND_URL || 'https://yourapp.com'}/scan/${card.qrCode}`,
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
}
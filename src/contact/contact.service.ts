import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { EmailService } from '../email/email.service';

@Injectable()
export class ContactService {
  constructor(
    private prisma: PrismaService,
    private emailService: EmailService,
  ) {}

  async requestContact(scanId: number, requesterEmail: string, requesterName: string, message?: string) {
    // Find the scan record to get profile owner info
    const scan = await this.prisma.scan.findUnique({
      where: { id: scanId },
      include: {
        qrCard: {
          include: {
            profile: {
              include: {
                user: {
                  select: {
                    id: true,
                    email: true,
                    name: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!scan) {
      throw new HttpException('Invalid scan ID', HttpStatus.NOT_FOUND);
    }

    const profileOwner = scan.qrCard.profile.user;

    // Create a contact request record
    const contactRequest = await this.prisma.match.create({
      data: {
        targetId: scan.viewerId || 0, // Who scanned the card
        userId: profileOwner.id, // Profile owner
        scanId: scanId,
        status: 'pending',
        requesterEmail,
        requesterName,
        message: message || `Hi! I scanned your QR card and would love to connect with you.`,
      },
    });

    // Send notification email to profile owner
    try {
      await this.sendContactRequestEmail(
        profileOwner.email,
        profileOwner.name || 'User',
        requesterName,
        requesterEmail,
        message || 'Someone would like to connect with you!',
        contactRequest.id,
      );
    } catch (error) {
      console.error('Failed to send contact request email:', error);
    }

    return {
      success: true,
      message: 'Contact request sent! The profile owner will be notified.',
      contactRequestId: contactRequest.id,
    };
  }

  async approveContactRequest(contactRequestId: number, profileOwnerId: number) {
    const contactRequest = await this.prisma.match.findFirst({
      where: { 
        id: contactRequestId, 
        userId: profileOwnerId,
        status: 'pending',
      },
      include: {
        user: true, // Profile owner
        scan: {
          include: {
            qrCard: {
              include: {
                profile: {
                  include: {
                    user: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!contactRequest) {
      throw new HttpException('Contact request not found', HttpStatus.NOT_FOUND);
    }

    // Update status to approved
    const updatedRequest = await this.prisma.match.update({
      where: { id: contactRequestId },
      data: { 
        status: 'approved',
        approvedAt: new Date(),
        contactShared: true,
      },
    });

    const profileOwner = contactRequest.user;

    // Send contact info to requester
    try {
      await this.sendContactInfoEmail(
        contactRequest.requesterEmail || '',
        contactRequest.requesterName || 'Anonymous',
        profileOwner.email,
        profileOwner.name || 'Profile Owner',
      );
    } catch (error) {
      console.error('Failed to send contact info email:', error);
    }

    return {
      success: true,
      message: 'Contact request approved! Contact information has been shared.',
      contactInfo: {
        email: profileOwner.email,
        name: profileOwner.name,
      },
    };
  }

  async rejectContactRequest(contactRequestId: number, profileOwnerId: number) {
    const contactRequest = await this.prisma.match.findFirst({
      where: { 
        id: contactRequestId, 
        userId: profileOwnerId,
        status: 'pending',
      },
    });

    if (!contactRequest) {
      throw new HttpException('Contact request not found', HttpStatus.NOT_FOUND);
    }

    // Update status to rejected
    await this.prisma.match.update({
      where: { id: contactRequestId },
      data: { status: 'rejected' },
    });

    return {
      success: true,
      message: 'Contact request declined.',
    };
  }

  async getContactRequests(userId: number, status?: string) {
    const whereClause: any = { userId: userId };
    if (status) {
      whereClause.status = status;
    }

    const requests = await this.prisma.match.findMany({
      where: whereClause,
      include: {
        scan: {
          include: {
            qrCard: {
              select: {
                qrCode: true,
                scanCount: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return requests;
  }

  private async sendContactRequestEmail(
    ownerEmail: string,
    ownerName: string,
    requesterName: string,
    requesterEmail: string,
    message: string,
    contactRequestId: number,
  ) {
    const approveUrl = `${process.env.FRONTEND_URL || 'https://yourapp.com'}/contact-request/${contactRequestId}/approve`;
    const rejectUrl = `${process.env.FRONTEND_URL || 'https://yourapp.com'}/contact-request/${contactRequestId}/reject`;

    const mailOptions = {
      from: process.env.FROM_EMAIL || 'noreply@qrcardating.com',
      to: ownerEmail,
      subject: '💕 Someone wants to connect with you!',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>New Contact Request! 💕</h2>
          <p>Hi ${ownerName},</p>
          
          <div style="background: #e7f3ff; padding: 20px; border-radius: 10px; margin: 20px 0; border-left: 5px solid #007bff;">
            <h3>Someone scanned your QR card!</h3>
            <p><strong>Name:</strong> ${requesterName}</p>
            <p><strong>Email:</strong> ${requesterEmail}</p>
            <p><strong>Message:</strong></p>
            <div style="background: white; padding: 15px; border-radius: 5px; margin: 10px 0;">
              ${message}
            </div>
          </div>
          
          <p>Would you like to share your contact information with them?</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${approveUrl}" style="background: #28a745; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block; margin: 10px;">
              ✅ Share Contact Info
            </a>
            
            <a href="${rejectUrl}" style="background: #dc3545; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block; margin: 10px;">
              ❌ Decline Request
            </a>
          </div>
          
          <p><small>This is part of the QR Card Dating experience. Your information is only shared when you approve it.</small></p>
        </div>
      `,
    };

    return this.emailService['transporter'].sendMail(mailOptions);
  }

  private async sendContactInfoEmail(
    requesterEmail: string,
    requesterName: string,
    ownerEmail: string,
    ownerName: string,
  ) {
    const mailOptions = {
      from: process.env.FROM_EMAIL || 'noreply@qrcardating.com',
      to: requesterEmail,
      subject: '🎉 Contact Request Approved!',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Great News! 🎉</h2>
          <p>Hi ${requesterName},</p>
          
          <div style="background: #d4edda; padding: 20px; border-radius: 10px; margin: 20px 0; border-left: 5px solid #28a745;">
            <h3>Contact Request Approved!</h3>
            <p><strong>${ownerName}</strong> has approved your contact request and is happy to connect with you!</p>
            
            <div style="background: white; padding: 15px; border-radius: 5px; margin: 15px 0;">
              <h4>Contact Information:</h4>
              <p><strong>Name:</strong> ${ownerName}</p>
              <p><strong>Email:</strong> <a href="mailto:${ownerEmail}">${ownerEmail}</a></p>
            </div>
          </div>
          
          <p>Feel free to reach out and start your conversation! 💕</p>
          
          <p><small>Remember to be respectful and genuine in your interactions. Have fun connecting!</small></p>
        </div>
      `,
    };

    return this.emailService['transporter'].sendMail(mailOptions);
  }
}
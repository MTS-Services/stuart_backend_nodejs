import { 
  Controller, 
  Post, 
  Get, 
  Put, 
  Body, 
  Param, 
  UseGuards, 
  Request,
  ParseIntPipe,
  Ip,
  Headers
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { QRCardService } from './qr-card.service';

@Controller('qr-cards')
export class QRCardController {
  constructor(private qrCardService: QRCardService) {}

  @Post('generate')
  @UseGuards(AuthGuard('jwt'))
  async generateCards(@Request() req, @Body('count') count: number = 50) {
    return this.qrCardService.generateQRCards(req.user.id, count);
  }

  // Email-based QR card generation - No Login Required
  @Post('generate/by-email')
  async generateCardsByEmail(@Body() body: { email: string; count?: number }) {
    const count = body.count || 50;
    return this.qrCardService.generateQRCardsByEmail(body.email, count);
  }

  @Get()
  @UseGuards(AuthGuard('jwt'))
  async getUserCards(@Request() req) {
    return this.qrCardService.getUserCards(req.user.id);
  }

  // Email-based QR cards retrieval - No Login Required
  @Get('by-email/:email')
  async getUserCardsByEmail(@Param('email') email: string) {
    return this.qrCardService.getUserCardsByEmail(email);
  }

  // Get all QR cards in the system (Admin endpoint)
  @Get('all')
  async getAllQRCards() {
    return this.qrCardService.getAllQRCards();
  }

  // Get QR cards with pagination
  @Get('paginated')
  async getPaginatedQRCards(
    @Body('page') page: number = 1,
    @Body('limit') limit: number = 10
  ) {
    return this.qrCardService.getPaginatedQRCards(page, limit);
  }

  // Get active QR cards only
  @Get('active')
  async getActiveQRCards() {
    return this.qrCardService.getActiveQRCards();
  }

  @Get(':cardId/scans')
  @UseGuards(AuthGuard('jwt'))
  async getCardScans(@Request() req, @Param('cardId', ParseIntPipe) cardId: number) {
    return this.qrCardService.getCardScans(req.user.id, cardId);
  }

  @Put(':cardId/deactivate')
  @UseGuards(AuthGuard('jwt'))
  async deactivateCard(@Request() req, @Param('cardId', ParseIntPipe) cardId: number) {
    return this.qrCardService.deactivateCard(req.user.id, cardId);
  }

  // Public endpoint for scanning QR codes with email functionality
  @Post('scan/:qrCode')
  async scanQRCode(
    @Param('qrCode') qrCode: string,
    @Body() body: { viewerId?: number; scannerEmail?: string },
    @Ip() ipAddress?: string,
    @Headers('user-agent') userAgent?: string
  ) {
    return this.qrCardService.scanQRCard(qrCode, {
      viewerId: body.viewerId,
      scannerEmail: body.scannerEmail,
      ipAddress,
      userAgent,
    });
  }

  // Public endpoint for scanning QR codes with email as URL parameter
  @Post('scan/:qrCode/:scannerEmail')
  async scanQRCodeWithEmail(
    @Param('qrCode') qrCode: string,
    @Param('scannerEmail') scannerEmail: string,
    @Body() body: { viewerId?: number } = {},
    @Ip() ipAddress?: string,
    @Headers('user-agent') userAgent?: string
  ) {
    return this.qrCardService.scanQRCard(qrCode, {
      viewerId: body.viewerId,
      scannerEmail: decodeURIComponent(scannerEmail),
      ipAddress,
      userAgent,
    });
  }

  // Debug endpoint to help understand QR code structure
  @Get('debug/scan-help')
  async getScanHelp() {
    return {
      message: 'QR Code Scanning Help with Email Notifications',
      correctUsage: {
        method1: {
          endpoint: 'POST /qr-cards/scan/{qrCode}',
          description: 'Email in request body',
          exampleUrl: 'POST /qr-cards/scan/550e8400-e29b-41d4-a716-446655440000',
          body: { 
            viewerId: 'optional_number',
            scannerEmail: 'optional_email_for_notifications'
          }
        },
        method2: {
          endpoint: 'POST /qr-cards/scan/{qrCode}/{scannerEmail}',
          description: 'Email as URL parameter (recommended)',
          exampleUrl: 'POST /qr-cards/scan/550e8400-e29b-41d4-a716-446655440000/scanner@example.com',
          body: { 
            viewerId: 'optional_number'
          }
        }
      },
      emailFeatures: {
        profileOwnerNotification: 'Profile owner gets notified when their QR is scanned',
        scannerProfileInfo: 'If scanner provides email, they receive profile contact info',
        scanLimitWarnings: 'Low scan count warnings for profile owners'
      },
      commonMistakes: [
        'Using base64 image data instead of UUID',
        'Using the full scan URL instead of just the UUID',
        'Using the QR image file instead of the identifier'
      ],
      workflow: [
        '1. Generate QR cards: POST /qr-cards/generate/by-email',
        '2. Extract qrCode field from response (UUID)',
        '3a. Scan with email in URL: POST /qr-cards/scan/{uuid}/{email}',
        '3b. OR scan with email in body: POST /qr-cards/scan/{uuid} + {"scannerEmail": "email"}',
        '4. Both parties receive email notifications with contact information'
      ],
      exampleResponse: {
        success: true,
        profile: { 
          name: 'John Doe', 
          contactEmail: 'john@example.com',
          age: 25,
          bio: 'Looking for connections!'
        },
        scansRemaining: 4,
        emailNotifications: {
          profileOwnerNotified: true,
          scannerNotified: true
        }
      }
    };
  }
}
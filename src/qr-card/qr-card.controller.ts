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

  // Public endpoint for scanning QR codes
  @Post('scan/:qrCode')
  async scanQRCode(
    @Param('qrCode') qrCode: string,
    @Body('viewerId') viewerId?: number,
    @Ip() ipAddress?: string,
    @Headers('user-agent') userAgent?: string
  ) {
    return this.qrCardService.scanQRCard(qrCode, {
      viewerId,
      ipAddress,
      userAgent,
    });
  }

  // Debug endpoint to help understand QR code structure
  @Get('debug/scan-help')
  async getScanHelp() {
    return {
      message: 'QR Code Scanning Help',
      correctUsage: {
        endpoint: 'POST /qr-cards/scan/{qrCode}',
        qrCodeFormat: 'UUID (e.g., abc-123-def-456)',
        exampleUrl: 'POST /qr-cards/scan/550e8400-e29b-41d4-a716-446655440000',
        body: { viewerId: 'optional_number' }
      },
      commonMistakes: [
        'Using base64 image data instead of UUID',
        'Using the full scan URL instead of just the UUID',
        'Using the QR image file instead of the identifier'
      ],
      workflow: [
        '1. Generate QR cards: POST /qr-cards/generate/by-email',
        '2. Extract qrCode field from response (UUID)',
        '3. Use UUID in scan endpoint: POST /qr-cards/scan/{uuid}',
        '4. Get profile information in response'
      ],
      exampleResponse: {
        qrCode: '550e8400-e29b-41d4-a716-446655440000',
        scanCount: 1,
        maxScans: 5,
        profile: { user: { name: 'John Doe', email: 'john@example.com' } }
      }
    };
  }
}
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

  @Get()
  @UseGuards(AuthGuard('jwt'))
  async getUserCards(@Request() req) {
    return this.qrCardService.getUserCards(req.user.id);
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
}
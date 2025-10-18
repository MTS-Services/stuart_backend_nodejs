import { Module } from '@nestjs/common';
import { QRCardController } from './qr-card.controller';
import { QRCardService } from './qr-card.service';
import { PrismaService } from '../prisma.service';
import { EmailService } from '../email/email.service';

@Module({
  controllers: [QRCardController],
  providers: [QRCardService, PrismaService, EmailService],
  exports: [QRCardService],
})
export class QRCardModule {}
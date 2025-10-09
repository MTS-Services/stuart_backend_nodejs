import { Module } from '@nestjs/common';
import { QRCardController } from './qr-card.controller';
import { QRCardService } from './qr-card.service';
import { PrismaService } from '../prisma.service';

@Module({
  controllers: [QRCardController],
  providers: [QRCardService, PrismaService],
  exports: [QRCardService],
})
export class QRCardModule {}
import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaService } from './prisma.service';
import { AuthModule } from './auth/auth.module';
import { ProfileModule } from './profile/profile.module';
import { QRCardModule } from './qr-card/qr-card.module';
import { AdminModule } from './admin/admin.module';
import { PaymentModule } from './payment/payment.module';
import { ContactModule } from './contact/contact.module';

@Module({
  imports: [
    AuthModule,
    ProfileModule,
    QRCardModule,
    AdminModule,
    PaymentModule,
    ContactModule,
  ],
  controllers: [AppController],
  providers: [AppService, PrismaService],
})
export class AppModule {}

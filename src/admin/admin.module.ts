import { Module } from '@nestjs/common';
import { AdminController, AdminDebugController } from './admin.controller';
import { AdminService } from './admin.service';
import { PrismaService } from '../prisma.service';
import { EmailModule } from '../email/email.module';

@Module({
  imports: [EmailModule],
  controllers: [AdminController, AdminDebugController],
  providers: [AdminService, PrismaService],
  exports: [AdminService],
})
export class AdminModule {}
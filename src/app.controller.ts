import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { PrismaService } from './prisma.service';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly prisma: PrismaService,
  ) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('test-db')
  async testDatabase() {
    try {
      // Simple database connection test
      const userCount = await this.prisma.user.count();
      const profileCount = await this.prisma.profile.count();
      
      return {
        message: 'Database connection successful!',
        data: {
          userCount,
          profileCount,
          timestamp: new Date().toISOString(),
        }
      };
    } catch (error) {
      return {
        message: 'Database connection failed!',
        error: error.message,
      };
    }
  }
}

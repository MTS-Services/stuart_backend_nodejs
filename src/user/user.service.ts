import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class UserService {
  constructor(private prisma: PrismaService) {}

  /**
   * Get user profile with all details
   * @param userId - User ID extracted from JWT token
   * @returns User object with profile, QR cards, subscription details
   */
  async getUserProfile(userId: number) {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        include: {
          profile: {
            select: {
              id: true,
              age: true,
              birthMonth: true,
              birthYear: true,
              height: true,
              bodyType: true,
              area: true,
              county: true,
              dealbreakers: true,
              bio: true,
              startDate: true,
              endDate: true,
              location: true,
              image: true,
              displayName: true,
              email: true,
              gmail: true,
              phone: true,
              status: true,
              reviewedAt: true,
              rejectionReason: true,
              rejectionHistory: true,
              isActive: true,
              createdAt: true,
              updatedAt: true,
            }
          },
          qrCards: {
            select: {
              id: true,
              qrCode: true,
              scanCount: true,
              maxScans: true,
              isActive: true,
              createdAt: true,
              updatedAt: true,
            },
            orderBy: {
              createdAt: 'desc'
            }
          },
          subscription: {
            select: {
              id: true,
              plan: true,
              status: true,
              startDate: true,
              endDate: true,
              amount: true,
              currency: true,
              stripeSubscriptionId: true,
              createdAt: true,
            }
          }
        }
      });

      if (!user) {
        throw new HttpException('User not found', HttpStatus.NOT_FOUND);
      }

      // Remove password from response for security
      const { password, ...userWithoutPassword } = user;
      
      // Add structured images to profile if it exists
      if (userWithoutPassword.profile) {
        const allImages = userWithoutPassword.profile.image || [];
        const structuredImages = {
          face: allImages.length > 0 ? allImages[0] : null,
          fullbody: allImages.length > 1 ? allImages[1] : null,
          toothyGrin: allImages.length > 2 ? allImages[2] : null,
          extras: allImages.length > 3 ? allImages.slice(3) : []
        };
        
        // Add images field to profile (TypeScript workaround)
        (userWithoutPassword.profile as any).images = structuredImages;
      }

      return {
        success: true,
        data: userWithoutPassword
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        `Failed to fetch user profile: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
}

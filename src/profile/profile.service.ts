import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { ProfileStatus, UserStatus } from '@prisma/client';
import { CreateProfileDto, UpdateProfileDto } from './profile.dto';

@Injectable()
export class ProfileService {
  constructor(private prisma: PrismaService) {}

  async createProfile(userId: number, createProfileDto: CreateProfileDto) {
    // Check if user exists and has paid setup fee
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new HttpException('User not found', HttpStatus.NOT_FOUND);
    }

    if (!user.paidSetupFee) {
      throw new HttpException('Setup fee must be paid before creating profile', HttpStatus.BAD_REQUEST);
    }

    // Check if profile already exists
    const existingProfile = await this.prisma.profile.findUnique({
      where: { userId },
    });

    if (existingProfile) {
      throw new HttpException('Profile already exists', HttpStatus.BAD_REQUEST);
    }

    // Create new profile
    const profile = await this.prisma.profile.create({
      data: {
        userId,
        ...createProfileDto,
        status: ProfileStatus.DRAFT,
      },
    });

    // Update user status
    await this.prisma.user.update({
      where: { id: userId },
      data: { status: UserStatus.PROFILE_PENDING },
    });

    return profile;
  }

  async updateProfile(userId: number, updateProfileDto: UpdateProfileDto) {
    const profile = await this.prisma.profile.findUnique({
      where: { userId },
    });

    if (!profile) {
      throw new HttpException('Profile not found', HttpStatus.NOT_FOUND);
    }

    if (profile.status === ProfileStatus.PENDING_REVIEW) {
      throw new HttpException('Cannot update profile while under review', HttpStatus.BAD_REQUEST);
    }

    return this.prisma.profile.update({
      where: { userId },
      data: updateProfileDto,
    });
  }

  async uploadPhoto(userId: number, photoType: 'face' | 'fullBody' | 'additional', photoUrl: string) {
    const profile = await this.prisma.profile.findUnique({
      where: { userId },
    });

    if (!profile) {
      throw new HttpException('Profile not found', HttpStatus.NOT_FOUND);
    }

    let updateData: any = {};

    if (photoType === 'face') {
      updateData.facePhoto = photoUrl;
    } else if (photoType === 'fullBody') {
      updateData.fullBodyPhoto = photoUrl;
    } else {
      // Add to photos array
      updateData.photos = {
        push: photoUrl,
      };
    }

    return this.prisma.profile.update({
      where: { userId },
      data: updateData,
    });
  }

  async submitForReview(userId: number) {
    const profile = await this.prisma.profile.findUnique({
      where: { userId },
    });

    if (!profile) {
      throw new HttpException('Profile not found', HttpStatus.NOT_FOUND);
    }

    if (!profile.facePhoto || !profile.fullBodyPhoto || !profile.bio) {
      throw new HttpException(
        'Face photo, full body photo, and bio are required before submission',
        HttpStatus.BAD_REQUEST,
      );
    }

    const updatedProfile = await this.prisma.profile.update({
      where: { userId },
      data: { status: ProfileStatus.PENDING_REVIEW },
    });

    // Create notification for admin
    await this.prisma.notification.create({
      data: {
        adminId: 1, // Default admin - in real app, this would be more dynamic
        type: 'profile_submitted',
        title: 'New Profile Submitted',
        message: `User ${profile.userId} has submitted their profile for review`,
        data: { userId, profileId: profile.id },
      },
    });

    return updatedProfile;
  }

  async getProfile(userId: number) {
    const profile = await this.prisma.profile.findUnique({
      where: { userId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            status: true,
            createdAt: true,
          },
        },
      },
    });

    if (!profile) {
      throw new HttpException('Profile not found', HttpStatus.NOT_FOUND);
    }

    return profile;
  }

  async deletePhoto(userId: number, photoUrl: string) {
    const profile = await this.prisma.profile.findUnique({
      where: { userId },
    });

    if (!profile) {
      throw new HttpException('Profile not found', HttpStatus.NOT_FOUND);
    }

    let updateData: any = {};

    if (profile.facePhoto === photoUrl) {
      updateData.facePhoto = null;
    } else if (profile.fullBodyPhoto === photoUrl) {
      updateData.fullBodyPhoto = null;
    } else {
      // Remove from photos array
      const updatedPhotos = profile.photos.filter(photo => photo !== photoUrl);
      updateData.photos = updatedPhotos;
    }

    return this.prisma.profile.update({
      where: { userId },
      data: updateData,
    });
  }
}
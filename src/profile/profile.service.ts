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

  async uploadPhoto(userId: number, photoType: 'face' | 'fullBody' | 'third' | 'additional', photoUrl: string) {
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
    } else if (photoType === 'third') {
      updateData.thirdPhoto = photoUrl;
    } else {
      // Add to additional photos array
      updateData.additionalPhotos = {
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
      // Remove from additional photos array
      const updatedPhotos = (profile.additionalPhotos || []).filter(photo => photo !== photoUrl);
      updateData.additionalPhotos = updatedPhotos;
    }

    return this.prisma.profile.update({
      where: { userId },
      data: updateData,
    });
  }

  // Email-based methods for simplified flow
  async createProfileByEmail(email: string, createProfileDto: any) {
    const user = await this.prisma.user.findUnique({
      where: { email: email },
    });

    if (!user) {
      throw new HttpException('User not found with this email', HttpStatus.NOT_FOUND);
    }

    // Extract only the profile fields, excluding email
    const { email: userEmail, ...profileData } = createProfileDto;
    
    return this.createProfile(user.id, profileData);
  }

  async getProfileByEmail(email: string) {
    const user = await this.prisma.user.findUnique({
      where: { email: email },
    });

    if (!user) {
      throw new HttpException('User not found with this email', HttpStatus.NOT_FOUND);
    }

    return this.getProfile(user.id);
  }

  async updateProfileByEmail(email: string, updateProfileDto: any) {
    const user = await this.prisma.user.findUnique({
      where: { email: email },
    });

    if (!user) {
      throw new HttpException('User not found with this email', HttpStatus.NOT_FOUND);
    }

    // Extract only the profile fields, excluding email
    const { email: userEmail, ...profileData } = updateProfileDto;
    
    return this.updateProfile(user.id, profileData);
  }

  async submitForReviewByEmail(email: string) {
    const user = await this.prisma.user.findUnique({
      where: { email: email },
    });

    if (!user) {
      throw new HttpException('User not found with this email', HttpStatus.NOT_FOUND);
    }

    return this.submitForReview(user.id);
  }

  // NEW METHODS FOR FILE UPLOAD SUPPORT

  async createProfileWithFiles(createProfileDto: CreateProfileDto, files: any) {
    // Find user by email from DTO
    const user = await this.prisma.user.findUnique({
      where: { email: createProfileDto.email },
    });

    if (!user) {
      throw new HttpException('User not found with this email', HttpStatus.NOT_FOUND);
    }

    // Check if profile already exists
    const existingProfile = await this.prisma.profile.findUnique({
      where: { userId: user.id },
    });

    if (existingProfile) {
      throw new HttpException('Profile already exists for this user', HttpStatus.BAD_REQUEST);
    }

    // Process uploaded files
    const photoData: any = {};
    
    if (files.facePhoto && files.facePhoto[0]) {
      photoData.facePhoto = `/uploads/profiles/${files.facePhoto[0].filename}`;
    }
    
    if (files.fullBodyPhoto && files.fullBodyPhoto[0]) {
      photoData.fullBodyPhoto = `/uploads/profiles/${files.fullBodyPhoto[0].filename}`;
    }
    
    if (files.thirdPhoto && files.thirdPhoto[0]) {
      photoData.thirdPhoto = `/uploads/profiles/${files.thirdPhoto[0].filename}`;
    }

    if (files.additionalPhotos && files.additionalPhotos.length > 0) {
      photoData.additionalPhotos = files.additionalPhotos
        .slice(0, 10) // Limit to 10 additional photos
        .map(file => `/uploads/profiles/${file.filename}`);
    }

    // Create profile with photos and form data
    const profile = await this.prisma.profile.create({
      data: {
        userId: user.id,
        age: createProfileDto.age,
        height: createProfileDto.height,
        bio: createProfileDto.bio,
        location: createProfileDto.location,
        ...photoData,
        status: 'DRAFT',
      },
    });

    return this.formatProfileResponse(profile);
  }

  async updateProfileWithFiles(updateProfileDto: UpdateProfileDto, files?: any) {
    // Find user by email
    const user = await this.prisma.user.findUnique({
      where: { email: updateProfileDto.email },
    });

    if (!user) {
      throw new HttpException('User not found with this email', HttpStatus.NOT_FOUND);
    }

    // Find existing profile
    const existingProfile = await this.prisma.profile.findUnique({
      where: { userId: user.id },
    });

    if (!existingProfile) {
      throw new HttpException('Profile not found for this user', HttpStatus.NOT_FOUND);
    }

    // Process new files if provided
    const updateData: any = {
      age: updateProfileDto.age,
      height: updateProfileDto.height,
      bio: updateProfileDto.bio,
      location: updateProfileDto.location,
    };

    if (files) {
      if (files.facePhoto && files.facePhoto[0]) {
        updateData.facePhoto = `/uploads/profiles/${files.facePhoto[0].filename}`;
      }
      
      if (files.fullBodyPhoto && files.fullBodyPhoto[0]) {
        updateData.fullBodyPhoto = `/uploads/profiles/${files.fullBodyPhoto[0].filename}`;
      }
      
      if (files.thirdPhoto && files.thirdPhoto[0]) {
        updateData.thirdPhoto = `/uploads/profiles/${files.thirdPhoto[0].filename}`;
      }

      if (files.additionalPhotos && files.additionalPhotos.length > 0) {
        // Append new additional photos to existing ones
        const newAdditionalPhotos = files.additionalPhotos
          .slice(0, 10)
          .map(file => `/uploads/profiles/${file.filename}`);
        
        const currentAdditional = existingProfile.additionalPhotos || [];
        const totalPhotos = [...currentAdditional, ...newAdditionalPhotos];
        
        updateData.additionalPhotos = totalPhotos.slice(0, 10); // Keep max 10
      }
    }

    // Update profile
    const updatedProfile = await this.prisma.profile.update({
      where: { userId: user.id },
      data: updateData,
    });

    return this.formatProfileResponse(updatedProfile);
  }

  async deleteProfile(email: string) {
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new HttpException('User not found with this email', HttpStatus.NOT_FOUND);
    }

    const profile = await this.prisma.profile.findUnique({
      where: { userId: user.id },
    });

    if (!profile) {
      throw new HttpException('Profile not found', HttpStatus.NOT_FOUND);
    }

    await this.prisma.profile.delete({
      where: { userId: user.id },
    });

    return { message: 'Profile deleted successfully' };
  }

  private formatProfileResponse(profile: any): any {
    const photoCount = [
      profile.facePhoto,
      profile.fullBodyPhoto, 
      profile.thirdPhoto,
      ...(profile.additionalPhotos || [])
    ].filter(Boolean).length;

    const isComplete = photoCount >= 3 && profile.facePhoto && profile.fullBodyPhoto && profile.thirdPhoto;

    return {
      ...profile,
      photoCount,
      isComplete,
      additionalPhotos: profile.additionalPhotos || [],
    };
  }
}
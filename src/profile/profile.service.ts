// src/profile/profile.service.ts

import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { ProfileStatus, UserStatus } from '@prisma/client';
import { CreateProfileDto, UpdateProfileDto } from './profile.dto'; 
import { ImageUploadService } from '../image-upload/image-upload.service';

// Utility type for the consolidated image array structure from the DTO
type ImageReference = { url: string };

@Injectable()
export class ProfileService {
  constructor(
    private prisma: PrismaService,
    private imageUploadService: ImageUploadService
  ) {}

  // -------------------------------------------------------------------
  // Validation: Checks required fields and image array count (min 3)
  // -------------------------------------------------------------------
  private validateProfileFields(profile: any): { isValid: boolean; missingFields: string[] } {
    const requiredFields = [
      'age', 'height', 'bodyType', 'area', 'bio', 'location', 
      'displayName', 'email', 'phone'
    ];
    
    const missingFields = requiredFields.filter(field => !profile[field]);

    // Check minimum image requirement (min 3)
    if (!profile.image || profile.image.length < 3) {
        missingFields.push('image (minimum 3 required)');
    }
    
    return {
      isValid: missingFields.length === 0,
      missingFields
    };
  }
  
  private async validateProfileForSubmission(profile: any) {
    const validation = this.validateProfileFields(profile);
    
    if (!validation.isValid) {
      throw new HttpException(
        `Profile is incomplete. Missing required fields: ${validation.missingFields.join(', ')}`,
        HttpStatus.BAD_REQUEST
      );
    }
    if (!profile.bio || profile.bio.length < 10) {
      throw new HttpException('Bio must be at least 10 characters long', HttpStatus.BAD_REQUEST);
    }
    if (profile.image && profile.image.length > 13) {
      throw new HttpException('Maximum 13 images allowed', HttpStatus.BAD_REQUEST);
    }
  }

  // -------------------------------------------------------------------
  // Image Upload Logic
  // -------------------------------------------------------------------
  public async uploadImages(files: Express.Multer.File[]): Promise<ImageReference[]> {
    if (!files || files.length === 0) { return []; }
    
    // Fix: Check for either buffer OR path (support both memory and disk storage)
    const validFiles = files.filter(file => file && (file.buffer || file.path));
    const result = await this.imageUploadService.uploadMultipleImages(validFiles);
    
    return result.urls.map((url: string) => ({ url }));
  }

  // -------------------------------------------------------------------
  // Profile Creation
  // -------------------------------------------------------------------
  async createProfileWithFiles(
    createProfileDto: CreateProfileDto, 
    files: { image?: Express.Multer.File[] } 
  ) {
    try {
      const uploadedImageReferences = await this.uploadImages(files.image || []);

      const fullCreateProfileDto = {
        ...createProfileDto,
        image: uploadedImageReferences, 
      };

      return await this.createProfileByEmail(fullCreateProfileDto.email, fullCreateProfileDto);
    } catch (error) {
      throw new HttpException(
        `Failed to create profile with files: ${error.message}`,
        error.status || HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  async createProfile(userId: number, createProfileDto: CreateProfileDto) {
    // ... existing checks ...
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) { throw new HttpException('User not found', HttpStatus.NOT_FOUND); }
    if (!user.paidSetupFee) { throw new HttpException('Setup fee must be paid before creating profile', HttpStatus.BAD_REQUEST); }
    const existingProfile = await this.prisma.profile.findUnique({ where: { userId } });
    if (existingProfile) { throw new HttpException('Profile already exists', HttpStatus.BAD_REQUEST); }

    const profile = await this.prisma.profile.create({
      data: {
        userId,
        age: createProfileDto.age ? createProfileDto.age.toString() : null, 
        height: createProfileDto.height,
        bio: createProfileDto.bio,
        location: createProfileDto.location,
        startDate: createProfileDto.startDate,
        endDate: createProfileDto.endDate,
        dealbreakers: createProfileDto.dealbreakers,
        
        // 🔥 FIXES TS2561 (Property 'image' does not exist): Now works after `prisma generate`
        image: createProfileDto.image.map(img => img.url), 
        
        status: ProfileStatus.DRAFT,
        bodyType: createProfileDto.bodyType,
        area: createProfileDto.area,
        displayName: createProfileDto.displayName,
        email: createProfileDto.email, 
        phone: createProfileDto.phone,
      },
    });

    await this.prisma.user.update({
      where: { id: userId },
      data: { status: UserStatus.PROFILE_PENDING },
    });

    return profile;
  }

  // -------------------------------------------------------------------
  // Profile Update
  // -------------------------------------------------------------------
  async updateProfileWithFiles(
    updateProfileDto: UpdateProfileDto, 
    files: { image?: Express.Multer.File[] } 
  ) {
    try {
      const user = await this.prisma.user.findUnique({ where: { email: updateProfileDto.email } });
      if (!user) { throw new HttpException('User not found', HttpStatus.NOT_FOUND); }

      const uploadedImageReferences = await this.uploadImages(files.image || []);

      const updateData = { ...updateProfileDto };

      if (uploadedImageReferences.length > 0) {
        updateData.image = uploadedImageReferences; 
      }
      
      return await this.updateProfile(user.id, updateData);

    } catch (error) {
      throw new HttpException(
        `Failed to update profile: ${error.message}`,
        error.status || HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  async updateProfile(userId: number, updateProfileDto: UpdateProfileDto) {
    const profile = await this.prisma.profile.findUnique({ where: { userId } });
    if (!profile) { throw new HttpException('Profile not found', HttpStatus.NOT_FOUND); }
    if (profile.status === ProfileStatus.PENDING_REVIEW) { throw new HttpException('Cannot update profile while under review', HttpStatus.BAD_REQUEST); }

    const updateData: any = {};
    
    if (updateProfileDto.age !== undefined) { updateData.age = updateProfileDto.age.toString(); }
    if (updateProfileDto.height !== undefined) { updateData.height = updateProfileDto.height; }
    if (updateProfileDto.bio !== undefined) { updateData.bio = updateProfileDto.bio; }
    if (updateProfileDto.location !== undefined) { updateData.location = updateProfileDto.location; }
    if (updateProfileDto.bodyType !== undefined) { updateData.bodyType = updateProfileDto.bodyType; }
    if (updateProfileDto.area !== undefined) { updateData.area = updateProfileDto.area; }
    if (updateProfileDto.displayName !== undefined) { updateData.displayName = updateProfileDto.displayName; }
    if (updateProfileDto.email !== undefined) { updateData.email = updateProfileDto.email; }
    if (updateProfileDto.phone !== undefined) { updateData.phone = updateProfileDto.phone; }
    
    if (updateProfileDto.image !== undefined) {
        updateData.image = updateProfileDto.image.map(img => img.url);
    }

    return this.prisma.profile.update({
      where: { userId },
      data: updateData,
    });
  }

  // -------------------------------------------------------------------
  // Single Photo Management
  // -------------------------------------------------------------------
  async addPhoto(userId: number, photoUrl: string) {
    const profile = await this.prisma.profile.findUnique({ where: { userId } });
    if (!profile) { throw new HttpException('Profile not found', HttpStatus.NOT_FOUND); }
    
    // 🔥 FIXES TS2551 (Property 'image' does not exist): Now works after `prisma generate`
    const currentImages = profile.image || []; 
    
    if (currentImages.length >= 13) {
        throw new HttpException('Profile already has the maximum of 13 images.', HttpStatus.BAD_REQUEST);
    }

    return this.prisma.profile.update({
      where: { userId },
      data: {
        // 🔥 FIXES TS2561 (Property 'image' does not exist): Now works after `prisma generate`
        image: { push: photoUrl } 
      },
    });
  }

  async deletePhoto(userId: number, photoUrl: string) {
    const profile = await this.prisma.profile.findUnique({ where: { userId } });
    if (!profile) { throw new HttpException('Profile not found', HttpStatus.NOT_FOUND); }
    
    // 🔥 FIXES TS2551 (Property 'image' does not exist): Now works after `prisma generate`
    const currentImages = profile.image || []; 
    const updatedImages = currentImages.filter(url => url !== photoUrl);

    if (updatedImages.length === currentImages.length) { 
        throw new HttpException('Photo URL not found in profile images.', HttpStatus.NOT_FOUND);
    }
    
    if (updatedImages.length < 3) {
        throw new HttpException('Cannot delete photo: minimum of 3 images required to maintain profile completeness.', HttpStatus.BAD_REQUEST);
    }

    return this.prisma.profile.update({
      where: { userId },
      data: {
        // 🔥 FIXES TS2561 (Property 'image' does not exist): Now works after `prisma generate`
        image: updatedImages,
      },
    });
  }
  
  // -------------------------
  // Submission and Retrieval Methods
  // -------------------------
  async submitForReview(userId: number) {
    const profile = await this.prisma.profile.findUnique({ where: { userId } });
    if (!profile) { throw new HttpException('Profile not found', HttpStatus.NOT_FOUND); }

    await this.validateProfileForSubmission(profile);

    const updatedProfile = await this.prisma.profile.update({
      where: { userId },
      data: { status: ProfileStatus.PENDING_REVIEW },
    });
    
    await this.prisma.notification.create({
      data: {
        adminId: 1, 
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
        user: { select: { id: true, email: true, name: true, status: true, createdAt: true } },
      },
    });

    if (!profile) { throw new HttpException('Profile not found', HttpStatus.NOT_FOUND); }

    return this.formatProfileResponse(profile);
  }

  async deleteProfile(email: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) { throw new HttpException('User not found with this email', HttpStatus.NOT_FOUND); }
    
    const profile = await this.prisma.profile.findUnique({ where: { userId: user.id } });
    if (!profile) { throw new HttpException('Profile not found', HttpStatus.NOT_FOUND); }

    await this.prisma.profile.delete({ where: { userId: user.id } });
    return { message: 'Profile deleted successfully' };
  }

  // -------------------------------------------------------------------
  // Response Formatting
  // -------------------------------------------------------------------
  private formatProfileResponse(profile: any): any {
    const allImages = profile.image || [];
    const photoCount = allImages.length;
    
    const isComplete = photoCount >= 3; 

    return {
      id: profile.id,
      userId: profile.userId,
      email: profile.user?.email || profile.email,
      age: profile.age ? parseInt(profile.age, 10) : undefined,
      height: profile.height,
      bio: profile.bio,
      location: profile.location,
      bodyType: profile.bodyType,
      area: profile.area,
      displayName: profile.displayName,
      phone: profile.phone,
      images: allImages.map((url: string) => ({ url })), 
      status: profile.status,
      photoCount,
      isComplete,
      createdAt: profile.createdAt,
      updatedAt: profile.updatedAt,
    };
  }
  
  // -------------------------
  // Email Wrapper Methods
  // -------------------------
  async createProfileByEmail(email: string, createProfileDto: any) {
    const user = await this.prisma.user.findUnique({ where: { email: email } });
    if (!user) { throw new HttpException('User not found with this email', HttpStatus.NOT_FOUND); }
    return this.createProfile(user.id, createProfileDto);
  }

  async getProfileByEmail(email: string) {
    const user = await this.prisma.user.findUnique({ where: { email: email } });
    if (!user) { throw new HttpException('User not found with this email', HttpStatus.NOT_FOUND); }
    return this.getProfile(user.id);
  }

  async updateProfileByEmail(email: string, updateProfileDto: any) {
    const user = await this.prisma.user.findUnique({ where: { email: email } });
    if (!user) { throw new HttpException('User not found with this email', HttpStatus.NOT_FOUND); }
    return this.updateProfile(user.id, updateProfileDto);
  }

  async submitForReviewByEmail(email: string) {
    const user = await this.prisma.user.findUnique({ where: { email: email } });
    if (!user) { throw new HttpException('User not found with this email', HttpStatus.NOT_FOUND); }
    return this.submitForReview(user.id);
  }
}
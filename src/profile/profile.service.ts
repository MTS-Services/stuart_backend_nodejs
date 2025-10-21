import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { ProfileStatus, UserStatus } from '@prisma/client';
import { CreateProfileDto, UpdateProfileDto } from './profile.dto';
import { ImageUploadService } from '../image-upload/image-upload.service';

@Injectable()
export class ProfileService {
  constructor(
    private prisma: PrismaService,
    private imageUploadService: ImageUploadService
  ) {}

  private validateProfileFields(profile: any): { isValid: boolean; missingFields: string[] } {
    const requiredFields = [
      'age',
      'height',
      'bodyType',
      'area',
      'bio',
      'location',
      'facePhoto',
      'fullBodyPhoto',
      'thirdPhoto',
      'displayName',
      'email',
      'phone'
    ];

    const missingFields = requiredFields.filter(field => !profile[field]);
    
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

    // Additional validations
    if (!profile.bio || profile.bio.length < 10) {
      throw new HttpException(
        'Bio must be at least 10 characters long',
        HttpStatus.BAD_REQUEST
      );
    }

    if (profile.additionalPhotos && profile.additionalPhotos.length > 10) {
      throw new HttpException(
        'Maximum 10 additional photos allowed',
        HttpStatus.BAD_REQUEST
      );
    }
  }

  private async uploadProfilePhotos(files: {
    facePhoto?: Express.Multer.File[];
    fullBodyPhoto?: Express.Multer.File[];
    thirdPhoto?: Express.Multer.File[];
    additionalPhotos?: Express.Multer.File[];
  }): Promise<{
    facePhoto?: string;
    fullBodyPhoto?: string;
    thirdPhoto?: string;
    additionalPhotos?: string[];
  }> {
    const uploadedFiles: {
      facePhoto?: string;
      fullBodyPhoto?: string;
      thirdPhoto?: string;
      additionalPhotos?: string[];
    } = {};

    if (!files) return uploadedFiles;

    const uploadPromises: Promise<void>[] = [];

    // Handle required photos
    if (files.facePhoto?.[0]) {
      uploadPromises.push(
        this.imageUploadService.uploadImage(files.facePhoto[0])
          .then(result => { uploadedFiles.facePhoto = result.url; })
      );
    }
    
    if (files.fullBodyPhoto?.[0]) {
      uploadPromises.push(
        this.imageUploadService.uploadImage(files.fullBodyPhoto[0])
          .then(result => { uploadedFiles.fullBodyPhoto = result.url; })
      );
    }
    
    if (files.thirdPhoto?.[0]) {
      uploadPromises.push(
        this.imageUploadService.uploadImage(files.thirdPhoto[0])
          .then(result => { uploadedFiles.thirdPhoto = result.url; })
      );
    }

    // Handle additional photos
    if (files.additionalPhotos?.length) {
      uploadPromises.push(
        this.imageUploadService.uploadMultipleImages(files.additionalPhotos)
          .then(result => { uploadedFiles.additionalPhotos = result.urls; })
      );
    }

    await Promise.all(uploadPromises);
    return uploadedFiles;
  }

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
        age: createProfileDto.age?.toString(),
        height: createProfileDto.height,
        bio: createProfileDto.bio,
        location: createProfileDto.location,
        facePhoto: createProfileDto.facePhoto,
        fullBodyPhoto: createProfileDto.fullBodyPhoto,
        thirdPhoto: createProfileDto.thirdPhoto,
        additionalPhotos: createProfileDto.additionalPhotos,
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

  async updateProfileWithFiles(updateProfileDto: UpdateProfileDto, files: {
    facePhoto?: Express.Multer.File[];
    fullBodyPhoto?: Express.Multer.File[];
    thirdPhoto?: Express.Multer.File[];
    additionalPhotos?: Express.Multer.File[];
  }) {
    try {
      // Find user by email first
      const user = await this.prisma.user.findUnique({
        where: { email: updateProfileDto.email },
      });

      if (!user) {
        throw new HttpException('User not found', HttpStatus.NOT_FOUND);
      }

      // Upload any new files
      const uploadedFiles = await this.uploadProfilePhotos(files);

      // Update the profile with new URLs and other data
      return await this.updateProfile(user.id, {
        ...updateProfileDto,
        ...uploadedFiles,
        additionalPhotos: uploadedFiles.additionalPhotos || undefined
      });
    } catch (error) {
      throw new HttpException(
        `Failed to update profile: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
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
      data: {
        age: updateProfileDto.age?.toString(),
        height: updateProfileDto.height,
        bio: updateProfileDto.bio,
        location: updateProfileDto.location,
        facePhoto: updateProfileDto.facePhoto,
        fullBodyPhoto: updateProfileDto.fullBodyPhoto,
        thirdPhoto: updateProfileDto.thirdPhoto,
        additionalPhotos: updateProfileDto.additionalPhotos,
      },
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

    // Validate all required fields
    await this.validateProfileForSubmission(profile);

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
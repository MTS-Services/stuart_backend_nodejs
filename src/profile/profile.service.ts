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

    // Handle facePhoto - Use .find(f => f) to skip any null/undefined entries in the array
    const faceFile = files.facePhoto?.find(f => f && f.path); 
    if (faceFile) {
      uploadPromises.push(
        this.imageUploadService.uploadImage(faceFile)
          .then(result => { uploadedFiles.facePhoto = result.url; })
      );
    }
    
    // Handle fullBodyPhoto - Use .find(f => f) to skip any null/undefined entries in the array
    const fullBodyFile = files.fullBodyPhoto?.find(f => f && f.path);
    if (fullBodyFile) {
      uploadPromises.push(
        this.imageUploadService.uploadImage(fullBodyFile)
          .then(result => { uploadedFiles.fullBodyPhoto = result.url; })
      );
    }
    
    // Handle thirdPhoto - Use .find(f => f) to skip any null/undefined entries in the array
    const thirdFile = files.thirdPhoto?.find(f => f && f.path);
    if (thirdFile) {
      uploadPromises.push(
        this.imageUploadService.uploadImage(thirdFile)
          .then(result => { uploadedFiles.thirdPhoto = result.url; })
      );
    }

    // Handle additional photos
    if (files.additionalPhotos?.length) {
      // Filter out any undefined/null entries AND only include those with a path
      const validAdditionalFiles = files.additionalPhotos.filter(file => file && file.path);

      if (validAdditionalFiles.length > 0) {
        uploadPromises.push(
          this.imageUploadService.uploadMultipleImages(validAdditionalFiles)
            .then(result => { uploadedFiles.additionalPhotos = result.urls; })
        );
      }
    }

    await Promise.all(uploadPromises);
    return uploadedFiles;
  }

  async createProfileWithFiles(createProfileDto: CreateProfileDto, files: {
    facePhoto?: Express.Multer.File[];
    fullBodyPhoto?: Express.Multer.File[];
    thirdPhoto?: Express.Multer.File[];
    additionalPhotos?: Express.Multer.File[];
  }) {
    try {
      // 1. Upload the files
      const uploadedFiles = await this.uploadProfilePhotos(files);

      // 2. Combine the DTO data with the new photo URLs
      const fullCreateProfileDto = {
        ...createProfileDto,
        ...uploadedFiles,
        // Prisma expects an array for additionalPhotos
        additionalPhotos: uploadedFiles.additionalPhotos || []
      };

      // 3. Use the existing logic to create the profile by email
      return await this.createProfileByEmail(fullCreateProfileDto.email, fullCreateProfileDto);

    } catch (error) {
      throw new HttpException(
        `Failed to create profile with files: ${error.message}`,
        error.status || HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
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
        // --- CRITICAL FIXES: Saving mandatory fields from DTO ---
        bodyType: createProfileDto.bodyType,
        area: createProfileDto.area,
        displayName: createProfileDto.displayName,
        email: createProfileDto.email, 
        phone: createProfileDto.phone,
        // --------------------------------------------------------
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
        additionalPhotos: uploadedFiles.additionalPhotos || updateProfileDto.additionalPhotos
      });
    } catch (error) {
      throw new HttpException(
        `Failed to update profile: ${error.message}`,
        error.status || HttpStatus.INTERNAL_SERVER_ERROR
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
        // Only update fields if they are explicitly present (or uploaded)
        ...(updateProfileDto.facePhoto !== undefined && { facePhoto: updateProfileDto.facePhoto }),
        ...(updateProfileDto.fullBodyPhoto !== undefined && { fullBodyPhoto: updateProfileDto.fullBodyPhoto }),
        ...(updateProfileDto.thirdPhoto !== undefined && { thirdPhoto: updateProfileDto.thirdPhoto }),
        ...(updateProfileDto.additionalPhotos !== undefined && { additionalPhotos: updateProfileDto.additionalPhotos }),
        // --- CRITICAL FIXES: Updating mandatory fields ---
        ...(updateProfileDto.bodyType !== undefined && { bodyType: updateProfileDto.bodyType }),
        ...(updateProfileDto.area !== undefined && { area: updateProfileDto.area }),
        ...(updateProfileDto.displayName !== undefined && { displayName: updateProfileDto.displayName }),
        ...(updateProfileDto.email !== undefined && { email: updateProfileDto.email }),
        ...(updateProfileDto.phone !== undefined && { phone: updateProfileDto.phone }),
        // ----------------------------------------------------
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

    return this.formatProfileResponse(profile);
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
    } else if (profile.thirdPhoto === photoUrl) {
      updateData.thirdPhoto = null;
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

    // Extract only the profile fields, excluding email and any file data passed from DTO
    const { email: userEmail, ...profileData } = createProfileDto;
    // NOTE: The DTO's `email` is deliberately re-used and saved to the profile model as per the fix above.
    
    return this.createProfile(user.id, createProfileDto);
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
    
    return this.updateProfile(user.id, updateProfileDto);
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
      facePhoto: profile.facePhoto,
      fullBodyPhoto: profile.fullBodyPhoto,
      thirdPhoto: profile.thirdPhoto,
      additionalPhotos: profile.additionalPhotos || [],
      status: profile.status,
      photoCount,
      isComplete,
      createdAt: profile.createdAt,
      updatedAt: profile.updatedAt,
    };
  }
}
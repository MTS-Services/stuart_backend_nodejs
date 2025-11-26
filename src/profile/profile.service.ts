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
  private readonly BETA_TESTING_MODE = true; // 🚨 Set to false after beta testing

  constructor(
    private prisma: PrismaService,
    private imageUploadService: ImageUploadService
  ) {}

  // -------------------------------------------------------------------
  // Validation: Checks required fields and image array count (min 3)
  // -------------------------------------------------------------------
  private validateProfileFields(profile: any): { isValid: boolean; missingFields: string[] } {
    const requiredFields = [
      'age', 'height', 'bodyType', 'county', 'bio', 'location', 
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
  // Structured Image Upload Logic
  // -------------------------------------------------------------------
  public async uploadStructuredImages(files: {
    image?: Express.Multer.File[];
    face?: Express.Multer.File[];
    fullbody?: Express.Multer.File[];
    toothyGrin?: Express.Multer.File[];
    extras?: Express.Multer.File[];
  }): Promise<{
    imageUrls: string[];
    imagesJson: {
      face?: string;
      fullbody?: string;
      toothyGrin?: string;
      extras?: { [key: string]: string };
    }
  }> {
    const result = {
      imageUrls: [] as string[],
      imagesJson: {} as any
    };

    // Upload consolidated images (if any)
    if (files.image && files.image.length > 0) {
      const imageUrls = await this.uploadImages(files.image);
      result.imageUrls = imageUrls.map(img => img.url);
    }

    // Upload face image
    if (files.face && files.face.length > 0) {
      const faceUrls = await this.uploadImages(files.face);
      result.imagesJson.face = faceUrls[0]?.url;
      if (!result.imageUrls.includes(faceUrls[0]?.url)) {
        result.imageUrls.push(faceUrls[0]?.url);
      }
    }

    // Upload fullbody image
    if (files.fullbody && files.fullbody.length > 0) {
      const fullbodyUrls = await this.uploadImages(files.fullbody);
      result.imagesJson.fullbody = fullbodyUrls[0]?.url;
      if (!result.imageUrls.includes(fullbodyUrls[0]?.url)) {
        result.imageUrls.push(fullbodyUrls[0]?.url);
      }
    }

    // Upload toothy grin image
    if (files.toothyGrin && files.toothyGrin.length > 0) {
      const toothyGrinUrls = await this.uploadImages(files.toothyGrin);
      result.imagesJson.toothyGrin = toothyGrinUrls[0]?.url;
      if (!result.imageUrls.includes(toothyGrinUrls[0]?.url)) {
        result.imageUrls.push(toothyGrinUrls[0]?.url);
      }
    }

    // Upload extras images
    if (files.extras && files.extras.length > 0) {
      const extrasUrls = await this.uploadImages(files.extras);
      result.imagesJson.extras = {};
      
      extrasUrls.forEach((urlObj, index) => {
        const key = (index + 1).toString(); // "1", "2", "3", etc.
        result.imagesJson.extras[key] = urlObj.url;
        if (!result.imageUrls.includes(urlObj.url)) {
          result.imageUrls.push(urlObj.url);
        }
      });
    }

    return result;
  }
  public async uploadImages(files: Express.Multer.File[]): Promise<ImageReference[]> {
    if (!files || files.length === 0) { return []; }
    
    // Fix: Check for either buffer OR path (support both memory and disk storage)
    const validFiles = files.filter(file => file && (file.buffer || file.path));
    const result = await this.imageUploadService.uploadMultipleImages(validFiles);
    
    return result.urls.map((url: string) => ({ url }));
  }

  // -------------------------------------------------------------------
  // Profile Creation with Structured Files
  // -------------------------------------------------------------------
  async createProfileWithStructuredFiles(
    createProfileDto: CreateProfileDto, 
    files: {
      image?: Express.Multer.File[];
      face?: Express.Multer.File[];
      fullbody?: Express.Multer.File[];
      toothyGrin?: Express.Multer.File[];
      extras?: Express.Multer.File[];
    }
  ) {
    try {
      // 🔍 SERVICE LOG: Before uploading images
      console.log('📤 SERVICE: Starting image upload process...');
      
      // Upload all structured files and get URLs + JSON structure
      const uploadResult = await this.uploadStructuredImages(files);

      console.log('✅ SERVICE: Images uploaded successfully');
      console.log('Image URLs:', uploadResult.imageUrls);
      console.log('Images JSON:', uploadResult.imagesJson);

      const fullCreateProfileDto = {
        ...createProfileDto,
        image: uploadResult.imageUrls.map(url => ({ url })), // Convert to ImageReference format
        images: uploadResult.imagesJson as any, // JSON structure
      };

      console.log('💾 SERVICE: Saving profile to database...');
      const result = await this.createProfileByEmail(fullCreateProfileDto.email, fullCreateProfileDto);
      console.log('✅ SERVICE: Profile saved to database with ID:', result?.profile?.id);

      return result;
    } catch (error) {
      throw new HttpException(
        `Failed to create profile with structured files: ${error.message}`,
        error.status || HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  // -------------------------------------------------------------------
  // Profile Creation (Legacy)
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
  const user = await this.prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new HttpException('User not found', HttpStatus.NOT_FOUND);
  }

  // 🚨 BETA TESTING: Bypass payment check or auto-mark as paid
  if (!user.paidSetupFee) {
    if (this.BETA_TESTING_MODE) {
      console.log('🚨 BETA MODE: Auto-marking user as paid for profile creation');
      
      // Auto-mark user as paid during beta testing
      await this.prisma.user.update({
        where: { id: userId },
        data: { paidSetupFee: true },
      });

      // Create a fake payment record for consistency
      await this.prisma.payment.create({
        data: {
          userId: userId,
          amount: 0,
          stripePaymentIntentId: `beta_profile_bypass_${userId}_${Date.now()}`,
          type: 'ONE_TIME',
          status: 'COMPLETED',
        },
      });
    } else {
      throw new HttpException(
        'Setup fee must be paid before creating profile',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  const existingProfile = await this.prisma.profile.findUnique({ where: { userId } });
  if (existingProfile) {
    throw new HttpException('Profile already exists', HttpStatus.BAD_REQUEST);
  }

  // ✅ Create the profile record
  const profile = await this.prisma.profile.create({
    data: {
      userId,
      age: createProfileDto.age ? createProfileDto.age.toString() : null,
      birthMonth: createProfileDto.birthMonth,
      birthYear: createProfileDto.birthYear,
      height: createProfileDto.height,
      bio: createProfileDto.bio,
      location: createProfileDto.location,
      startDate: createProfileDto.startDate,
      endDate: createProfileDto.endDate,
      dealbreakers: createProfileDto.dealbreakers,
      image: createProfileDto.image.map((img) => img.url),
      images: createProfileDto.images as any || undefined, // New JSON field
      status: ProfileStatus.DRAFT,
      bodyType: createProfileDto.bodyType,
      area: null, // Set to null since we're only using county now
      county: createProfileDto.county,
      displayName: createProfileDto.displayName,
      email: createProfileDto.email, // saved in DB
      gmail: createProfileDto.gmail, // saved in DB
      phone: createProfileDto.phone,
    },
  });

  await this.prisma.user.update({
    where: { id: userId },
    data: { status: UserStatus.PROFILE_PENDING },
  });

  // ✅ Here's the change: always use the incoming email for profileInfo
  const profileInfo = {
    displayName: createProfileDto.displayName,
    gmail: createProfileDto.gmail, // ← Always take from request
    phone: createProfileDto.phone,
  };

  return { profile, profileInfo };
}


  // -------------------------------------------------------------------
  // Profile Update with Structured Files
  // -------------------------------------------------------------------
  async updateProfileWithStructuredFiles(
    updateProfileDto: UpdateProfileDto, 
    files: {
      image?: Express.Multer.File[];
      face?: Express.Multer.File[];
      fullbody?: Express.Multer.File[];
      toothyGrin?: Express.Multer.File[];
      extras?: Express.Multer.File[];
    }
  ) {
    try {
      const user = await this.prisma.user.findUnique({ where: { email: updateProfileDto.email } });
      if (!user) { throw new HttpException('User not found', HttpStatus.NOT_FOUND); }

      // Get existing profile to preserve existing images
      const existingProfile = await this.prisma.profile.findUnique({ where: { userId: user.id } });
      if (!existingProfile) {
        throw new HttpException('Profile not found', HttpStatus.NOT_FOUND);
      }

      const updateData = { ...updateProfileDto };

      // Check if any structured files are uploaded
      const hasStructuredFiles = (files.face && files.face.length > 0) ||
                                (files.fullbody && files.fullbody.length > 0) ||
                                (files.toothyGrin && files.toothyGrin.length > 0) ||
                                (files.extras && files.extras.length > 0) ||
                                (files.image && files.image.length > 0);

      if (hasStructuredFiles) {
        // Upload all structured files and get URLs + JSON structure
        const uploadResult = await this.uploadStructuredImages(files);
        
        // Check update mode (default is 'merge')
        const updateMode = updateData.imageUpdateMode || 'merge';
        
        if (updateMode === 'replace') {
          // Replace mode: use only new images
          updateData.image = uploadResult.imageUrls.map(url => ({ url }));
          updateData.images = uploadResult.imagesJson as any;
          console.log(`🔄 Structured image replace: Using ${uploadResult.imageUrls.length} new images`);
        } else {
          // Merge mode: add new images to existing ones
          const existingImages = existingProfile.image || [];
          const existingImagesJson = existingProfile.images as any || {};
          
          // Check total image limit
          const totalImages = existingImages.length + uploadResult.imageUrls.length;
          if (totalImages > 13) {
            throw new HttpException(
              `Total image limit exceeded. You have ${existingImages.length} existing images and are trying to add ${uploadResult.imageUrls.length} more. Maximum allowed is 13 images.`,
              HttpStatus.BAD_REQUEST
            );
          }

          // Merge images
          const allImageUrls = [...existingImages, ...uploadResult.imageUrls];
          updateData.image = allImageUrls.map(url => ({ url }));
          
          // Merge JSON structure
          const mergedImagesJson = {
            ...existingImagesJson,
            ...uploadResult.imagesJson,
            extras: {
              ...existingImagesJson.extras,
              ...uploadResult.imagesJson.extras
            }
          };
          updateData.images = mergedImagesJson;
          
          console.log(`➕ Structured image merge: ${existingImages.length} existing + ${uploadResult.imageUrls.length} new = ${allImageUrls.length} total`);
        }
      }
      
      return await this.updateProfile(user.id, updateData);

    } catch (error) {
      throw new HttpException(
        `Failed to update profile with structured files: ${error.message}`,
        error.status || HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  // -------------------------------------------------------------------
  // Profile Update (Legacy)
  // -------------------------------------------------------------------
  async updateProfileWithFiles(
    updateProfileDto: UpdateProfileDto, 
    files: { image?: Express.Multer.File[] } 
  ) {
    try {
      const user = await this.prisma.user.findUnique({ where: { email: updateProfileDto.email } });
      if (!user) { throw new HttpException('User not found', HttpStatus.NOT_FOUND); }

      // Get existing profile to preserve existing images
      const existingProfile = await this.prisma.profile.findUnique({ where: { userId: user.id } });
      if (!existingProfile) {
        throw new HttpException('Profile not found', HttpStatus.NOT_FOUND);
      }

      const updateData = { ...updateProfileDto };

      // Handle images: merge existing images with new uploads or replace them
      if (files.image && files.image.length > 0) {
        const uploadedImageReferences = await this.uploadImages(files.image);
        
        // Check update mode (default is 'merge')
        const updateMode = updateData.imageUpdateMode || 'merge';
        
        if (updateMode === 'replace') {
          // Replace mode: use only new images
          updateData.image = uploadedImageReferences;
          console.log(`🔄 Image replace: Using ${uploadedImageReferences.length} new images (replacing all existing)`);
        } else {
          // Merge mode: add new images to existing ones
          const existingImages = existingProfile.image || [];
          
          // Check total image limit (3 required + up to 10 optional = 13 max)
          const totalImages = existingImages.length + uploadedImageReferences.length;
          if (totalImages > 13) {
            throw new HttpException(
              `Total image limit exceeded. You have ${existingImages.length} existing images and are trying to add ${uploadedImageReferences.length} more. Maximum allowed is 13 images.`,
              HttpStatus.BAD_REQUEST
            );
          }

          // Merge existing images with new uploads
          const allImages = [
            ...existingImages.map(url => ({ url })),
            ...uploadedImageReferences
          ];
          
          updateData.image = allImages;
          console.log(`➕ Image merge: ${existingImages.length} existing + ${uploadedImageReferences.length} new = ${allImages.length} total`);
        }
      }
      // If no new images uploaded, preserve existing images by not updating the image field
      
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
    
    // Prevent updates only when profile is under review, not when it's draft
    if (profile.status === ProfileStatus.PENDING_REVIEW) { 
      throw new HttpException('Cannot update profile while under review', HttpStatus.BAD_REQUEST); 
    }

    const updateData: any = {};
    
    if (updateProfileDto.age !== undefined) { updateData.age = updateProfileDto.age.toString(); }
    if (updateProfileDto.birthMonth !== undefined) { updateData.birthMonth = updateProfileDto.birthMonth; }
    if (updateProfileDto.birthYear !== undefined) { updateData.birthYear = updateProfileDto.birthYear; }
    if (updateProfileDto.height !== undefined) { updateData.height = updateProfileDto.height; }
    if (updateProfileDto.bio !== undefined) { updateData.bio = updateProfileDto.bio; }
    if (updateProfileDto.location !== undefined) { updateData.location = updateProfileDto.location; }
    if (updateProfileDto.bodyType !== undefined) { updateData.bodyType = updateProfileDto.bodyType; }
    if (updateProfileDto.county !== undefined) { 
      updateData.county = updateProfileDto.county; 
      updateData.area = null; // Set area to null when county is provided
    }
    if (updateProfileDto.displayName !== undefined) { updateData.displayName = updateProfileDto.displayName; }
    if (updateProfileDto.email !== undefined) { updateData.email = updateProfileDto.email; }
    if (updateProfileDto.gmail !== undefined) { updateData.gmail = updateProfileDto.gmail; }
    if (updateProfileDto.phone !== undefined) { updateData.phone = updateProfileDto.phone; }
    
    if (updateProfileDto.image !== undefined) {
        updateData.image = updateProfileDto.image.map(img => img.url);
    }
    
    // Handle new images JSON field
    if (updateProfileDto.images !== undefined) {
        updateData.images = updateProfileDto.images as any;
    }

    // When user updates their profile after rejection, set status back to DRAFT for admin review
    if (profile.status === ProfileStatus.REJECTED) {
      updateData.status = ProfileStatus.DRAFT;
      
      // Also update user status to indicate profile is pending review
      await this.prisma.user.update({
        where: { id: userId },
        data: { status: UserStatus.PROFILE_PENDING },
      });
    }

    console

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

    // Also clean up the images JSON field if the deleted photo is referenced there
    let updatedImagesJson = profile.images as any;
    if (updatedImagesJson) {
      if (updatedImagesJson.face === photoUrl) {
        updatedImagesJson.face = null;
      }
      if (updatedImagesJson.fullbody === photoUrl) {
        updatedImagesJson.fullbody = null;
      }
      if (updatedImagesJson.toothyGrin === photoUrl) {
        updatedImagesJson.toothyGrin = null;
      }
      if (updatedImagesJson.extras) {
        Object.keys(updatedImagesJson.extras).forEach(key => {
          if (updatedImagesJson.extras[key] === photoUrl) {
            delete updatedImagesJson.extras[key];
          }
        });
      }
    }

    return this.prisma.profile.update({
      where: { userId },
      data: {
        // 🔥 FIXES TS2561 (Property 'image' does not exist): Now works after `prisma generate`
        image: updatedImages,
        images: updatedImagesJson,
      },
    });
  }

  async deletePhotoByIndex(userId: number, imageIndex: number) {
    const profile = await this.prisma.profile.findUnique({ where: { userId } });
    if (!profile) { throw new HttpException('Profile not found', HttpStatus.NOT_FOUND); }
    
    const currentImages = profile.image || []; 
    
    if (imageIndex < 0 || imageIndex >= currentImages.length) {
        throw new HttpException('Invalid image index.', HttpStatus.BAD_REQUEST);
    }
    
    // if (currentImages.length <= 3) {
    //     throw new HttpException('Cannot delete photo: minimum of 3 images required.', HttpStatus.BAD_REQUEST);
    // }

    const photoToDelete = currentImages[imageIndex];
    const updatedImages = currentImages.filter((_, index) => index !== imageIndex);

    // Also clean up the images JSON field if the deleted photo is referenced there
    let updatedImagesJson = profile.images as any;
    if (updatedImagesJson && photoToDelete) {
      if (updatedImagesJson.face === photoToDelete) {
        updatedImagesJson.face = null;
      }
      if (updatedImagesJson.fullbody === photoToDelete) {
        updatedImagesJson.fullbody = null;
      }
      if (updatedImagesJson.toothyGrin === photoToDelete) {
        updatedImagesJson.toothyGrin = null;
      }
      if (updatedImagesJson.extras) {
        Object.keys(updatedImagesJson.extras).forEach(key => {
          if (updatedImagesJson.extras[key] === photoToDelete) {
            delete updatedImagesJson.extras[key];
          }
        });
      }
    }

    return this.prisma.profile.update({
      where: { userId },
      data: { 
        image: updatedImages,
        images: updatedImagesJson,
      },
    });
  }

  async reorderImages(userId: number, newImageOrder: string[]) {
    const profile = await this.prisma.profile.findUnique({ where: { userId } });
    if (!profile) { throw new HttpException('Profile not found', HttpStatus.NOT_FOUND); }
    
    const currentImages = profile.image || []; 
    
    // Validate that all current images are included in the new order
    if (newImageOrder.length !== currentImages.length) {
        throw new HttpException('New image order must contain exactly the same number of images.', HttpStatus.BAD_REQUEST);
    }

    // Validate that all URLs in the new order exist in current images
    const missingUrls = newImageOrder.filter(url => !currentImages.includes(url));
    if (missingUrls.length > 0) {
        throw new HttpException('New image order contains URLs not found in current images.', HttpStatus.BAD_REQUEST);
    }

    return this.prisma.profile.update({
      where: { userId },
      data: { image: newImageOrder },
    });
  }

  // Replace all images with new URL array
  async replaceAllImages(userId: number, imageUrls: string[]) {
    const profile = await this.prisma.profile.findUnique({ where: { userId } });
    if (!profile) { throw new HttpException('Profile not found', HttpStatus.NOT_FOUND); }

    // Validate minimum images requirement
    if (imageUrls.length < 3) {
      throw new HttpException('Minimum 3 images required', HttpStatus.BAD_REQUEST);
    }

    // Validate maximum images limit
    if (imageUrls.length > 13) {
      throw new HttpException('Maximum 13 images allowed', HttpStatus.BAD_REQUEST);
    }

    return this.prisma.profile.update({
      where: { userId },
      data: { image: imageUrls },
    });
  }
  async updateImagesJson(userId: number, imagesData: {
    face?: string;
    fullbody?: string;
    toothyGrin?: string;
    extras?: { [key: string]: string };
  }) {
    const profile = await this.prisma.profile.findUnique({ where: { userId } });
    if (!profile) { throw new HttpException('Profile not found', HttpStatus.NOT_FOUND); }

    return this.prisma.profile.update({
      where: { userId },
      data: { images: imagesData as any },
    });
  }

  // Delete specific image type from JSON structure
  async deleteImageFromJson(userId: number, imageType: 'face' | 'fullbody' | 'toothyGrin') {
    const profile = await this.prisma.profile.findUnique({ where: { userId } });
    if (!profile) { throw new HttpException('Profile not found', HttpStatus.NOT_FOUND); }

    let updatedImagesJson = profile.images as any || {
      face: null,
      fullbody: null,
      toothyGrin: null,
      extras: {}
    };

    updatedImagesJson[imageType] = null;

    return this.prisma.profile.update({
      where: { userId },
      data: { images: updatedImagesJson },
    });
  }

  // Delete specific extra image from JSON structure
  async deleteExtraImageFromJson(userId: number, extraKey: string) {
    const profile = await this.prisma.profile.findUnique({ where: { userId } });
    if (!profile) { throw new HttpException('Profile not found', HttpStatus.NOT_FOUND); }

    let updatedImagesJson = profile.images as any || {
      face: null,
      fullbody: null,
      toothyGrin: null,
      extras: {}
    };

    if (updatedImagesJson.extras && updatedImagesJson.extras[extraKey]) {
      delete updatedImagesJson.extras[extraKey];
    } else {
      throw new HttpException('Extra image key not found', HttpStatus.NOT_FOUND);
    }

    return this.prisma.profile.update({
      where: { userId },
      data: { images: updatedImagesJson },
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
      data: { status: ProfileStatus.DRAFT },
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

    // Auto-clear expired travel mode data
    const updatedProfile = await this.checkAndClearExpiredTravelMode(profile);

    return this.formatProfileResponse(updatedProfile);
  }

  // Helper method to check and clear expired travel mode
  private async checkAndClearExpiredTravelMode(profile: any) {
    // Check if travel mode data exists and if end date has passed
    if (profile.endDate) {
      try {
        const currentDate = new Date();
        const travelEndDate = new Date(profile.endDate);
        
        // If end date has passed, clear travel mode data
        if (travelEndDate < currentDate) {
          const updatedProfile = await this.prisma.profile.update({
            where: { id: profile.id },
            data: {
              startDate: null,
              endDate: null,
              location: null,
            },
            include: {
              user: { select: { id: true, email: true, name: true, status: true, createdAt: true } },
            },
          });
          return updatedProfile;
        }
      } catch (error) {
        // If date parsing fails, log error but don't block the response
        console.error('Error parsing travel dates for auto-clear:', error);
      }
    }
    
    return profile;
  }

  // Helper method to get user by email
  async getUserByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email } });
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
    
    // Handle images JSON field - return empty object structure if null/empty
    const imagesJson = profile.images || {
      face: null,
      fullbody: null,
      toothyGrin: null,
      extras: {}
    };

    // Create new structured images field based on existing image array
    const structuredImages = {
      face: allImages.length > 0 ? allImages[0] : null,
      fullbody: allImages.length > 1 ? allImages[1] : null,
      toothyGrin: allImages.length > 2 ? allImages[2] : null,
      extras: allImages.length > 3 ? allImages.slice(3) : []
    };

    return {
      id: profile.id,
      userId: profile.userId,
      email: profile.user?.email || profile.email,
      age: profile.age ? parseInt(profile.age, 10) : undefined,
      birthMonth: profile.birthMonth,
      birthYear: profile.birthYear,
      height: profile.height,
      bio: profile.bio,
      location: profile.location,
      bodyType: profile.bodyType,
      county: profile.county,
      displayName: profile.displayName,
      phone: profile.phone,
      gmail: profile.gmail,
      dealbreakers: profile.dealbreakers,
      startDate: profile.startDate,
      endDate: profile.endDate,
      images: structuredImages, // New structured images field
      imageUrls: allImages, // Raw array of image URLs (for backward compatibility)
      imagesJson: imagesJson, // Legacy structured images field (if exists)
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
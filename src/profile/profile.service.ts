// src/profile/profile.service.ts

import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { Prisma, ProfileStatus, UserStatus } from '@prisma/client';
import { CreateProfileDto, UpdateProfileDto } from './profile.dto'; 
import { ImageUploadService } from '../image-upload/image-upload.service';

// Utility type for the consolidated image array structure from the DTO
type ImageReference = { url: string };

type ImagesJson = {
  face?: string | null;
  fullbody?: string | null;
  toothyGrin?: string | null;
  extras?: { [key: string]: string } | string[];
};

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
      'age', 'height', 'bodyType', 'county', 'bio',
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
  // Image JSON ↔ array sync helpers (images JSON is canonical)
  // -------------------------------------------------------------------
  private parseImagesField(value: unknown): ImagesJson | undefined {
    if (value === undefined || value === null || value === '') {
      return undefined;
    }
    if (typeof value === 'string') {
      try {
        return JSON.parse(value) as ImagesJson;
      } catch {
        return undefined;
      }
    }
    if (typeof value === 'object') {
      return value as ImagesJson;
    }
    return undefined;
  }

  private buildImageArrayFromJson(imagesJson: ImagesJson | null | undefined): string[] {
    if (!imagesJson) return [];

    const urls: string[] = [];
    if (imagesJson.face) urls.push(imagesJson.face);
    if (imagesJson.fullbody) urls.push(imagesJson.fullbody);
    if (imagesJson.toothyGrin) urls.push(imagesJson.toothyGrin);

    if (imagesJson.extras) {
      if (Array.isArray(imagesJson.extras)) {
        imagesJson.extras.forEach((url) => {
          if (url) urls.push(url);
        });
      } else {
        Object.entries(imagesJson.extras)
          .sort(([a], [b]) => Number(a) - Number(b))
          .forEach(([, url]) => {
            if (url) urls.push(url);
          });
      }
    }

    return urls;
  }

  private buildJsonFromImageArray(urls: string[]): ImagesJson {
    const extras: { [key: string]: string } = {};
    urls.slice(3).forEach((url, index) => {
      extras[(index + 1).toString()] = url;
    });

    return {
      face: urls[0] || null,
      fullbody: urls[1] || null,
      toothyGrin: urls[2] || null,
      extras,
    };
  }

  private getStructuredImagesForResponse(
    imagesJson: ImagesJson | null | undefined,
    imageArray: string[],
  ): ImagesJson {
    const hasStructuredData =
      imagesJson &&
      (imagesJson.face ||
        imagesJson.fullbody ||
        imagesJson.toothyGrin ||
        (imagesJson.extras &&
          (Array.isArray(imagesJson.extras)
            ? imagesJson.extras.length > 0
            : Object.keys(imagesJson.extras).length > 0)));

    if (hasStructuredData) {
      return {
        face: imagesJson.face || null,
        fullbody: imagesJson.fullbody || null,
        toothyGrin: imagesJson.toothyGrin || null,
        extras: imagesJson.extras || {},
      };
    }

    return this.buildJsonFromImageArray(imageArray);
  }

  private mergeStructuredUpload(
    existingImagesJson: ImagesJson,
    uploadResult: {
      imagesJson: ImagesJson;
      imageUrls: string[];
    },
  ): ImagesJson {
    const merged: ImagesJson = {
      face: existingImagesJson.face || null,
      fullbody: existingImagesJson.fullbody || null,
      toothyGrin: existingImagesJson.toothyGrin || null,
      extras: this.getExtrasAsObject(existingImagesJson.extras),
    };

    if (uploadResult.imagesJson.face) {
      merged.face = uploadResult.imagesJson.face;
    }
    if (uploadResult.imagesJson.fullbody) {
      merged.fullbody = uploadResult.imagesJson.fullbody;
    }
    if (uploadResult.imagesJson.toothyGrin) {
      merged.toothyGrin = uploadResult.imagesJson.toothyGrin;
    }

    if (uploadResult.imagesJson.extras) {
      const existingExtras =
        merged.extras && !Array.isArray(merged.extras) ? merged.extras : {};
      const existingKeys = Object.keys(existingExtras)
        .map(Number)
        .filter((n) => !isNaN(n));
      let nextKey =
        existingKeys.length > 0 ? Math.max(...existingKeys) + 1 : 1;

      Object.values(uploadResult.imagesJson.extras).forEach((url) => {
        if (url) {
          existingExtras[nextKey.toString()] = url;
          nextKey++;
        }
      });
      merged.extras = existingExtras;
    }

    return merged;
  }

  private normalizeEmptyString(value: string | null | undefined): string | null {
    if (value === undefined || value === null) return null;
    const trimmed = value.trim();
    return trimmed === '' ? null : trimmed;
  }

  private getExtrasAsObject(
    extras: ImagesJson['extras'],
  ): { [key: string]: string } {
    if (!extras) return {};
    if (Array.isArray(extras)) {
      return extras.reduce(
        (acc, url, index) => {
          if (url) acc[(index + 1).toString()] = url;
          return acc;
        },
        {} as { [key: string]: string },
      );
    }
    return { ...extras };
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
      image: createProfileDto.images
        ? this.buildImageArrayFromJson(createProfileDto.images as ImagesJson)
        : createProfileDto.image.map((img) => img.url),
      images: createProfileDto.images as any || undefined, // New JSON field
      status: ProfileStatus.DRAFT,
      bodyType: createProfileDto.bodyType,
      area: null, // Set to null since we're only using county now
      county: createProfileDto.county,
      displayName: createProfileDto.displayName,
      username: createProfileDto.username, // USERNAME FIELD
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

      const parsedImages = this.parseImagesField(updateData.images);
      if (parsedImages) {
        updateData.images = parsedImages as any;
      } else if (updateData.images !== undefined) {
        delete updateData.images;
      }

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

        // Use client-provided images JSON as base when present (preserves reorder)
        let baseImagesJson: ImagesJson =
          updateData.images && typeof updateData.images === 'object'
            ? (updateData.images as ImagesJson)
            : (existingProfile.images as ImagesJson) || {};
        
        if (updateMode === 'replace') {
          const mergedImagesJson = uploadResult.imagesJson;
          updateData.image = this.buildImageArrayFromJson(mergedImagesJson).map(
            (url) => ({ url }),
          );
          updateData.images = mergedImagesJson as any;
          console.log(
            `🔄 Structured image replace: Using ${uploadResult.imageUrls.length} new images`,
          );
        } else {
          const mergedImagesJson = this.mergeStructuredUpload(
            baseImagesJson,
            uploadResult,
          );
          const allImageUrls = this.buildImageArrayFromJson(mergedImagesJson);

          if (allImageUrls.length > 13) {
            throw new HttpException(
              `Total image limit exceeded. Maximum allowed is 13 images.`,
              HttpStatus.BAD_REQUEST,
            );
          }

          updateData.image = allImageUrls.map((url) => ({ url }));
          updateData.images = mergedImagesJson as any;

          console.log(
            `➕ Structured image merge: ${allImageUrls.length} total after merge`,
          );
        }
      } else if (updateData.images && typeof updateData.images === 'object') {
        const imagesJson = updateData.images as ImagesJson;
        const imageUrls = this.buildImageArrayFromJson(imagesJson);
        if (imageUrls.length > 0) {
          updateData.images = imagesJson as any;
          updateData.image = imageUrls.map((url) => ({ url }));
        } else {
          delete updateData.images;
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

    const parsedImages = this.parseImagesField(updateProfileDto.images);
    if (parsedImages) {
      updateProfileDto.images = parsedImages as any;
    } else if (updateProfileDto.images !== undefined) {
      updateProfileDto.images = undefined;
    }
    
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
    if (updateProfileDto.location !== undefined) {
      updateData.location = this.normalizeEmptyString(updateProfileDto.location);
    }
    if (updateProfileDto.startDate !== undefined) {
      updateData.startDate = this.normalizeEmptyString(updateProfileDto.startDate);
    }
    if (updateProfileDto.endDate !== undefined) {
      updateData.endDate = this.normalizeEmptyString(updateProfileDto.endDate);
    }
    if (updateProfileDto.dealbreakers !== undefined) { updateData.dealbreakers = updateProfileDto.dealbreakers; }
    if (updateProfileDto.bodyType !== undefined) { updateData.bodyType = updateProfileDto.bodyType; }
    if (updateProfileDto.county !== undefined) { 
      updateData.county = updateProfileDto.county; 
      updateData.area = null; // Set area to null when county is provided
    }
    if (updateProfileDto.displayName !== undefined) { updateData.displayName = updateProfileDto.displayName; }
    if (updateProfileDto.username !== undefined) { updateData.username = updateProfileDto.username; }
    if (updateProfileDto.email !== undefined) { updateData.email = updateProfileDto.email; }
    if (updateProfileDto.gmail !== undefined) { updateData.gmail = updateProfileDto.gmail; }
    if (updateProfileDto.phone !== undefined) { updateData.phone = updateProfileDto.phone; }
    
    if (updateProfileDto.image !== undefined) {
        updateData.image = updateProfileDto.image.map(img => img.url);
    }
    
    // Handle new images JSON field — keep image[] in sync
    if (updateProfileDto.images !== undefined) {
        const imageUrls = this.buildImageArrayFromJson(
          updateProfileDto.images as ImagesJson,
        );
        // Never wipe photos when client sends an empty images payload
        if (imageUrls.length > 0) {
          updateData.images = updateProfileDto.images as any;
          updateData.image = imageUrls;
        }
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

    // When an APPROVED profile is edited with substantive changes, revert to DRAFT for re-review
    // Travel-mode-only edits (startDate, endDate, location) do NOT trigger re-pending
    // Admin edits skip re-pending entirely
    const isAdminEdit = updateProfileDto.adminEdit === 'true';
    
    if (profile.status === ProfileStatus.APPROVED && !isAdminEdit) {
      const travelOnlyFields = new Set(['startDate', 'endDate', 'location']);
      const substantiveKeys = Object.keys(updateData).filter(key => !travelOnlyFields.has(key));
      
      if (substantiveKeys.length > 0) {
        // Track which fields the user changed for admin review
        updateData.changedFields = substantiveKeys;
        updateData.status = ProfileStatus.DRAFT;
        
        await this.prisma.user.update({
          where: { id: userId },
          data: { status: UserStatus.PROFILE_PENDING },
        });

        // Notify admin that a verified user edited their profile
        await this.prisma.notification.create({
          data: {
            adminId: 1,
            type: 'profile_edited',
            title: 'Verified Profile Edited',
            message: `Verified user ${userId} has edited their profile and requires re-review`,
            data: { userId, profileId: profile.id, changedFields: substantiveKeys },
          },
        });
      }
    }

    // Clear changedFields when admin approves or admin edits
    if (isAdminEdit) {
      updateData.changedFields = Prisma.DbNull;
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
    
    const currentImages = profile.image || [];

    if (!currentImages.includes(photoUrl)) {
      throw new HttpException('Photo URL not found in profile images.', HttpStatus.NOT_FOUND);
    }

    let updatedImagesJson = (profile.images as ImagesJson) || {
      face: null,
      fullbody: null,
      toothyGrin: null,
      extras: {},
    };

    if (updatedImagesJson.face === photoUrl) {
      updatedImagesJson.face = null;
    }
    if (updatedImagesJson.fullbody === photoUrl) {
      updatedImagesJson.fullbody = null;
    }
    if (updatedImagesJson.toothyGrin === photoUrl) {
      updatedImagesJson.toothyGrin = null;
    }
    if (updatedImagesJson.extras && !Array.isArray(updatedImagesJson.extras)) {
      Object.keys(updatedImagesJson.extras).forEach((key) => {
        if (updatedImagesJson.extras![key] === photoUrl) {
          delete updatedImagesJson.extras![key];
        }
      });
    }

    const syncedImages = this.buildImageArrayFromJson(updatedImagesJson);

    if (syncedImages.length < 3) {
      throw new HttpException(
        'Cannot delete photo: minimum of 3 images required to maintain profile completeness.',
        HttpStatus.BAD_REQUEST,
      );
    }

    return this.prisma.profile.update({
      where: { userId },
      data: {
        image: syncedImages,
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

    // Also clean up the images JSON field if the deleted photo is referenced there
    let updatedImagesJson = profile.images as ImagesJson;
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
      if (updatedImagesJson.extras && !Array.isArray(updatedImagesJson.extras)) {
        Object.keys(updatedImagesJson.extras).forEach((key) => {
          if (updatedImagesJson.extras![key] === photoToDelete) {
            delete updatedImagesJson.extras![key];
          }
        });
      }
    }

    const syncedImages = this.buildImageArrayFromJson(updatedImagesJson);

    return this.prisma.profile.update({
      where: { userId },
      data: {
        image: syncedImages,
        images: updatedImagesJson,
      },
    });
  }

  async reorderImages(
    userId: number,
    payload: { imageOrder?: string[]; images?: ImagesJson },
  ) {
    const profile = await this.prisma.profile.findUnique({ where: { userId } });
    if (!profile) { throw new HttpException('Profile not found', HttpStatus.NOT_FOUND); }

    let imagesJson: ImagesJson;
    let imageArray: string[];

    if (payload.images) {
      imagesJson = payload.images;
      imageArray = this.buildImageArrayFromJson(imagesJson);
    } else if (payload.imageOrder) {
      const currentImages = profile.image || [];

      if (payload.imageOrder.length !== currentImages.length) {
        throw new HttpException(
          'New image order must contain exactly the same number of images.',
          HttpStatus.BAD_REQUEST,
        );
      }

      const missingUrls = payload.imageOrder.filter(
        (url) => !currentImages.includes(url),
      );
      if (missingUrls.length > 0) {
        throw new HttpException(
          'New image order contains URLs not found in current images.',
          HttpStatus.BAD_REQUEST,
        );
      }

      imageArray = payload.imageOrder;
      imagesJson = this.buildJsonFromImageArray(imageArray);
    } else {
      throw new HttpException(
        'Either imageOrder or images must be provided.',
        HttpStatus.BAD_REQUEST,
      );
    }

    return this.prisma.profile.update({
      where: { userId },
      data: {
        image: imageArray,
        images: imagesJson as any,
      },
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
      data: {
        image: imageUrls,
        images: this.buildJsonFromImageArray(imageUrls) as any,
      },
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
      data: {
        images: imagesData as any,
        image: this.buildImageArrayFromJson(imagesData),
      },
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
      data: {
        images: updatedImagesJson,
        image: this.buildImageArrayFromJson(updatedImagesJson),
      },
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
      data: {
        images: updatedImagesJson,
        image: this.buildImageArrayFromJson(updatedImagesJson),
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
    
    const imagesJson = profile.images || {
      face: null,
      fullbody: null,
      toothyGrin: null,
      extras: {},
    };

    const structuredImages = this.getStructuredImagesForResponse(
      imagesJson,
      allImages,
    );

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
      area: profile.area,
      displayName: profile.displayName,
      username: profile.username,
      phone: profile.phone,
      gmail: profile.gmail,
      dealbreakers: profile.dealbreakers,
      startDate: profile.startDate,
      endDate: profile.endDate,
      images: structuredImages,
      imageUrls: this.buildImageArrayFromJson(structuredImages),
      imagesJson: structuredImages,
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
// src/profile/profile.controller.ts

import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Body,
  Param,
  UseInterceptors,
  UploadedFiles,
  HttpException,
  HttpStatus,
  BadRequestException // Retained for clarity
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { ProfileService } from './profile.service';
import { CreateProfileDto, UpdateProfileDto, SubmitProfileDto } from './profile.dto';

// --- File Field Configuration (UPDATED) ---
// Support for both consolidated images and structured image uploads
const FILE_FIELDS = [
  { name: 'image', maxCount: 13 }, // Original consolidated field
  { name: 'face', maxCount: 1 },   // Face image file
  { name: 'fullbody', maxCount: 1 }, // Fullbody image file  
  { name: 'toothyGrin', maxCount: 1 }, // Toothy grin image file
  { name: 'extras', maxCount: 10 }, // Extra images (max 10)
];// --- Required Photo Count (UPDATED) ---
const MINIMUM_REQUIRED_PHOTOS = 3;

@Controller('profile')
export class ProfileController {
  constructor(
    private profileService: ProfileService,
    // REMOVED: ImageUploadService is only needed in the ProfileService.
  ) {}

  /**
   * Helper function to check for the presence of required files (min 3, max 13).
   * Now supports both consolidated 'image' field and structured uploads.
   */
  private validateRequiredFiles(files: { [key: string]: Express.Multer.File[] }) {
    const images = files.image || [];
    const face = files.face || [];
    const fullbody = files.fullbody || [];
    const toothyGrin = files.toothyGrin || [];
    const extras = files.extras || [];
    
    // Count total files from both upload methods
    const totalFiles = images.length + face.length + fullbody.length + toothyGrin.length + extras.length;
    
    // 1. Check Minimum Count (at least 3 total)
    if (totalFiles < MINIMUM_REQUIRED_PHOTOS) {
      throw new HttpException(
        `Minimum required profile photos not met. You must upload at least ${MINIMUM_REQUIRED_PHOTOS} images total.`,
        HttpStatus.BAD_REQUEST,
      );
    }

    // 2. For structured uploads, check if required image types are present
    if (face.length > 0 || fullbody.length > 0 || toothyGrin.length > 0 || extras.length > 0) {
      // Using structured upload - validate required types
      const missing: string[] = [];
      if (face.length === 0) missing.push('Face');
      if (fullbody.length === 0) missing.push('Full Body');
      if (toothyGrin.length === 0) missing.push('Toothy Grin');
      
      if (missing.length > 0) {
        throw new HttpException(
          `Required image types missing: ${missing.join(', ')}. Please upload Face, Full Body, and Toothy Grin images.`,
          HttpStatus.BAD_REQUEST,
        );
      }
    }

    // 3. Check Maximum Count (max 13 total)
    if (totalFiles > 13) {
      throw new HttpException(
        `Maximum image limit exceeded. You uploaded ${totalFiles} images, but maximum allowed is 13.`,
        HttpStatus.BAD_REQUEST,
      );
    }

    // 4. Check for temporary path existence (Multer failure)
    const allFiles = [...images, ...face, ...fullbody, ...toothyGrin, ...extras];
    for (const file of allFiles) {
      if (!file || (!file.path && !file.buffer)) {
        throw new HttpException(
          `One or more files were uploaded but missing temporary path. Upload may have failed.`,
          HttpStatus.BAD_REQUEST,
        );
      }
    }
  }  // -------------------------
  // POST /profile (Create Profile)
  // -------------------------
  @Post()
  // UPDATED: Use the new FILE_FIELDS array with structured uploads
  @UseInterceptors(FileFieldsInterceptor(FILE_FIELDS)) 
  async createProfile(
    @Body() createProfileDto: CreateProfileDto,
    // UPDATED: Support both consolidated and structured file uploads
    @UploadedFiles() files: { 
      image?: Express.Multer.File[];
      face?: Express.Multer.File[];
      fullbody?: Express.Multer.File[];
      toothyGrin?: Express.Multer.File[];
      extras?: Express.Multer.File[];
    }
  ) {
    try {
      // 🔍 BACKEND LOG: Before processing profile creation
      console.log('============================================');
      console.log('📥 BACKEND: Received Profile Creation Request');
      console.log('============================================');
      console.log('Profile Data:', {
        email: createProfileDto.email,
        displayName: createProfileDto.displayName,
        username: createProfileDto.username,
        birthMonth: createProfileDto.birthMonth,
        birthYear: createProfileDto.birthYear,
        age: createProfileDto.age,
        height: createProfileDto.height,
        bodyType: createProfileDto.bodyType,
        county: createProfileDto.county,
        location: createProfileDto.location,
        bioLength: createProfileDto.bio?.length || 0,
        dealbreakersLength: createProfileDto.dealbreakers?.length || 0
      });
      console.log('Uploaded Files:', {
        face: files.face?.length || 0,
        fullbody: files.fullbody?.length || 0,
        toothyGrin: files.toothyGrin?.length || 0,
        extras: files.extras?.length || 0,
        image: files.image?.length || 0,
        totalFiles: (files.face?.length || 0) + (files.fullbody?.length || 0) + (files.toothyGrin?.length || 0) + (files.extras?.length || 0) + (files.image?.length || 0)
      });
      console.log('File Details:', [
        ...(files.face || []).map(f => ({ type: 'face', name: f.originalname, size: `${(f.size / 1024 / 1024).toFixed(2)}MB` })),
        ...(files.fullbody || []).map(f => ({ type: 'fullbody', name: f.originalname, size: `${(f.size / 1024 / 1024).toFixed(2)}MB` })),
        ...(files.toothyGrin || []).map(f => ({ type: 'toothyGrin', name: f.originalname, size: `${(f.size / 1024 / 1024).toFixed(2)}MB` })),
        ...(files.extras || []).map(f => ({ type: 'extra', name: f.originalname, size: `${(f.size / 1024 / 1024).toFixed(2)}MB` })),
        ...(files.image || []).map(f => ({ type: 'image', name: f.originalname, size: `${(f.size / 1024 / 1024).toFixed(2)}MB` }))
      ]);
      console.log('============================================');

      // 1. CRITICAL: Validate file presence (min 3 total)
      this.validateRequiredFiles(files);

      // 2. Call the service with structured files
      const result = await this.profileService.createProfileWithStructuredFiles(createProfileDto, files);

      // 🔍 BACKEND LOG: After successful profile creation
      console.log('============================================');
      console.log('✅ BACKEND: Profile Created Successfully');
      console.log('============================================');
      console.log('Created Profile ID:', result?.profile?.id);
      console.log('User Email:', result?.profile?.email);
      console.log('Total Images Uploaded:', result?.profile?.image?.length || 0);
      console.log('============================================');

      return result;
    } catch (error) {
      // Handle errors as before
      if (error instanceof HttpException) {
        throw error;
      }
      
      throw new HttpException(
        `Failed to create profile: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }  // -------------------------
  // GET /profile/:email (Get Profile)
  // -------------------------
  @Get(':email')
  async getProfile(@Param('email') email: string) {
    return this.profileService.getProfileByEmail(email);
  }

  // -------------------------
  // PUT /profile (Update Profile)
  // -------------------------
  @Put()
  // UPDATED: Use the new FILE_FIELDS array with structured uploads
  @UseInterceptors(FileFieldsInterceptor(FILE_FIELDS)) 
  async updateProfile(
    @Body() updateProfileDto: UpdateProfileDto,
    @UploadedFiles() files: { 
      image?: Express.Multer.File[];
      face?: Express.Multer.File[];
      fullbody?: Express.Multer.File[];
      toothyGrin?: Express.Multer.File[];
      extras?: Express.Multer.File[];
    } 
  ) {
    try {
      return await this.profileService.updateProfileWithStructuredFiles(updateProfileDto, files);
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        `Failed to update profile: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }  // -------------------------
  // DELETE /profile/:email (Delete Profile)
  // -------------------------
  @Delete(':email')
  async deleteProfile(@Param('email') email: string) {
    return this.profileService.deleteProfile(email);
  }

  // -------------------------
  // POST /profile/submit (Submit for Review)
  // -------------------------
  @Post('submit')
  async submitForReview(@Body() submitDto: SubmitProfileDto) {
    // The service validates if the profile is complete (including min 3 images) before submitting.
    return this.profileService.submitForReviewByEmail(submitDto.email);
  }

  // -------------------------
  // Image Management Endpoints  
  // -------------------------
  
  // DELETE /profile/:email/image/:index (Delete specific image by index)
  @Delete(':email/image/:index')
  async deleteImageByIndex(
    @Param('email') email: string,
    @Param('index') index: string
  ) {
    try {
      const user = await this.profileService.getUserByEmail(email);
      if (!user) {
        throw new HttpException('User not found', HttpStatus.NOT_FOUND);
      }
      
      const imageIndex = parseInt(index, 10);
      if (isNaN(imageIndex)) {
        throw new HttpException('Invalid image index', HttpStatus.BAD_REQUEST);
      }

      return await this.profileService.deletePhotoByIndex(user.id, imageIndex);
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        `Failed to delete image: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  // DELETE /profile/:email/image (Delete specific image by URL)  
  @Delete(':email/image')
  async deleteImageByUrl(
    @Param('email') email: string,
    @Body() body: { imageUrl: string }
  ) {
    try {
      const user = await this.profileService.getUserByEmail(email);
      if (!user) {
        throw new HttpException('User not found', HttpStatus.NOT_FOUND);
      }

      return await this.profileService.deletePhoto(user.id, body.imageUrl);
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        `Failed to delete image: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  // PUT /profile/:email/images/json (Update images JSON structure)
  @Put(':email/images/json')
  async updateImagesJson(
    @Param('email') email: string,
    @Body() body: {
      face?: string;
      fullbody?: string;
      toothyGrin?: string;
      extras?: { [key: string]: string };
    }
  ) {
    try {
      const user = await this.profileService.getUserByEmail(email);
      if (!user) {
        throw new HttpException('User not found', HttpStatus.NOT_FOUND);
      }

      return await this.profileService.updateImagesJson(user.id, body);
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        `Failed to update images JSON: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  // DELETE /profile/:email/images/json/:type (Delete specific image type from JSON)
  @Delete(':email/images/json/:type')
  async deleteImageFromJson(
    @Param('email') email: string,
    @Param('type') type: 'face' | 'fullbody' | 'toothyGrin'
  ) {
    try {
      const user = await this.profileService.getUserByEmail(email);
      if (!user) {
        throw new HttpException('User not found', HttpStatus.NOT_FOUND);
      }

      if (!['face', 'fullbody', 'toothyGrin'].includes(type)) {
        throw new HttpException('Invalid image type. Must be: face, fullbody, or toothyGrin', HttpStatus.BAD_REQUEST);
      }

      return await this.profileService.deleteImageFromJson(user.id, type as any);
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        `Failed to delete image from JSON: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  // DELETE /profile/:email/images/json/extras/:key (Delete specific extra image from JSON)
  @Delete(':email/images/json/extras/:key')
  async deleteExtraImageFromJson(
    @Param('email') email: string,
    @Param('key') key: string
  ) {
    try {
      const user = await this.profileService.getUserByEmail(email);
      if (!user) {
        throw new HttpException('User not found', HttpStatus.NOT_FOUND);
      }

      return await this.profileService.deleteExtraImageFromJson(user.id, key);
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        `Failed to delete extra image from JSON: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  // PUT /profile/:email/images/replace (Replace all images with URL array)\n  @Put(':email/images/replace')\n  async replaceAllImages(\n    @Param('email') email: string,\n    @Body() body: { imageUrls: string[] }\n  ) {\n    try {\n      const user = await this.profileService.getUserByEmail(email);\n      if (!user) {\n        throw new HttpException('User not found', HttpStatus.NOT_FOUND);\n      }\n\n      if (!Array.isArray(body.imageUrls)) {\n        throw new HttpException('imageUrls must be an array', HttpStatus.BAD_REQUEST);\n      }\n\n      return await this.profileService.replaceAllImages(user.id, body.imageUrls);\n    } catch (error) {\n      if (error instanceof HttpException) {\n        throw error;\n      }\n      throw new HttpException(\n        `Failed to replace images: ${error.message}`,\n        HttpStatus.INTERNAL_SERVER_ERROR\n      );\n    }\n  }\n\n  // PUT /profile/:email/images/reorder (Reorder images)
  @Put(':email/images/reorder')
  async reorderImages(
    @Param('email') email: string,
    @Body() body: { imageOrder: string[] }
  ) {
    try {
      const user = await this.profileService.getUserByEmail(email);
      if (!user) {
        throw new HttpException('User not found', HttpStatus.NOT_FOUND);
      }

      if (!Array.isArray(body.imageOrder)) {
        throw new HttpException('imageOrder must be an array', HttpStatus.BAD_REQUEST);
      }

      return await this.profileService.reorderImages(user.id, body.imageOrder);
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        `Failed to reorder images: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
}
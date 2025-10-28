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
// Consolidated four fields into one 'image' field with a max count of 13.
const FILE_FIELDS = [
  { name: 'image', maxCount: 13 },
];

// --- Required Photo Count (UPDATED) ---
const MINIMUM_REQUIRED_PHOTOS = 3;

@Controller('profile')
export class ProfileController {
  constructor(
    private profileService: ProfileService,
    // REMOVED: ImageUploadService is only needed in the ProfileService.
  ) {}

  /**
   * Helper function to check for the presence of required files (min 3, max 13).
   */
  private validateRequiredFiles(files: { [key: string]: Express.Multer.File[] }) {
    const images = files.image || [];
    const count = images.length;
    
    // 1. Check Minimum Count
    if (count < MINIMUM_REQUIRED_PHOTOS) {
      throw new HttpException(
        `Minimum required profile photos not met. You must upload at least ${MINIMUM_REQUIRED_PHOTOS} images.`,
        HttpStatus.BAD_REQUEST,
      );
    }

    // 2. Check for temporary path existence (Multer failure)
    for (const file of images) {
            if (!file || (!file.path && !file.buffer)) {
        throw new HttpException(
          `One or more files were uploaded but missing temporary path. Upload may have failed.`,
          HttpStatus.BAD_REQUEST,
        );
      }
    }
  }

  // -------------------------
  // POST /profile (Create Profile)
  // -------------------------
  @Post()
  // UPDATED: Use the new FILE_FIELDS array
  @UseInterceptors(FileFieldsInterceptor(FILE_FIELDS)) 
  async createProfile(
    @Body() createProfileDto: CreateProfileDto,
    // UPDATED: Correctly type the files object for the single 'image' field
    @UploadedFiles() files: { image?: Express.Multer.File[] }
  ) {
    try {
      // 1. CRITICAL: Validate file presence (min 3)
      this.validateRequiredFiles(files);

      // 2. Call the service
      // The service handles file processing and DTO merging
      return await this.profileService.createProfileWithFiles(createProfileDto, files);
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
  }

  // -------------------------
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
  // UPDATED: Use the new FILE_FIELDS array
  @UseInterceptors(FileFieldsInterceptor(FILE_FIELDS)) 
  async updateProfile(
    @Body() updateProfileDto: UpdateProfileDto,
    @UploadedFiles() files: { image?: Express.Multer.File[] } 
  ) {
    try {
      return await this.profileService.updateProfileWithFiles(updateProfileDto, files);
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        `Failed to update profile: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  // -------------------------
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
}
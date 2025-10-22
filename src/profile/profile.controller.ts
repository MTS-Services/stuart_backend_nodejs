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
  // ... other imports
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { ProfileService } from './profile.service';
import { ImageUploadService } from '../image-upload/image-upload.service';
import { CreateProfileDto, UpdateProfileDto } from './profile.dto';

// --- File Field Configuration ---
const FILE_FIELDS = [
  { name: 'facePhoto', maxCount: 1 },
  { name: 'fullBodyPhoto', maxCount: 1 },
  { name: 'thirdPhoto', maxCount: 1 },
  { name: 'additionalPhotos', maxCount: 10 },
];

// --- Required File Keys for Creation ---
const REQUIRED_PHOTOS = ['facePhoto', 'fullBodyPhoto', 'thirdPhoto'];

@Controller('profile')
export class ProfileController {
  constructor(
    private profileService: ProfileService,
    private imageUploadService: ImageUploadService 
  ) {}

  /**
   * Helper function to check for the presence of required files.
   * This logic ensures the "File object is missing" error is caught here with a 400.
   */
  private validateRequiredFiles(files: { [key: string]: Express.Multer.File[] }) {
    for (const field of REQUIRED_PHOTOS) {
      // 🛑 CRITICAL FIX: Check if the file array is missing (undefined) or empty.
      if (!files || !files[field] || files[field].length === 0) {
        // Throw a 400 Bad Request if a mandatory file is missing
        throw new HttpException(
          `Missing required profile photo: ${field}. Please upload all mandatory files.`,
          HttpStatus.BAD_REQUEST,
        );
      }
    }
  }

  // -------------------------
  // POST /profile (Create Profile)
  // -------------------------
  @Post()
  @UseInterceptors(FileFieldsInterceptor(FILE_FIELDS))
  async createProfile(
    @Body() createProfileDto: CreateProfileDto,
    @UploadedFiles() files: {
      facePhoto?: Express.Multer.File[];
      fullBodyPhoto?: Express.Multer.File[];
      thirdPhoto?: Express.Multer.File[];
      additionalPhotos?: Express.Multer.File[];
    }
  ) {
    try {
      // 1. CRITICAL FIX: Validate file presence before calling the service
      // This MUST throw 400 if files are missing, preventing the service from crashing.
      this.validateRequiredFiles(files);

      // 2. Call the service
      return await this.profileService.createProfileWithFiles(createProfileDto, files);
    } catch (error) {
      // Throw existing error if it's already an HttpException (like the one from validateRequiredFiles or service)
      if (error instanceof HttpException) {
        throw error;
      }
      
      // Wrap unexpected errors in a 500
      throw new HttpException(
        `Failed to create profile: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  // ... (rest of the controller methods remain the same) ...
}
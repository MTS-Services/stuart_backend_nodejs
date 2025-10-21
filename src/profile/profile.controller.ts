import { Controller, Post, Get, Put, Delete, Body, Param, UseInterceptors, UploadedFiles, HttpException, HttpStatus } from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { ProfileService } from './profile.service';
import { ImageUploadService } from '../image-upload/image-upload.service';
import { CreateProfileDto, UpdateProfileDto, SubmitProfileDto, ProfileResponseDto } from './profile.dto';

@Controller('profile')
export class ProfileController {
  constructor(
    private profileService: ProfileService,
    private imageUploadService: ImageUploadService
  ) {}

  @Post()
  @UseInterceptors(FileFieldsInterceptor([
    { name: 'facePhoto', maxCount: 1 },
    { name: 'fullBodyPhoto', maxCount: 1 },
    { name: 'thirdPhoto', maxCount: 1 },
    { name: 'additionalPhotos', maxCount: 10 },
  ]))
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
      return await this.profileService.createProfileWithFiles(createProfileDto, files);
    } catch (error) {
      throw new HttpException(
        `Failed to create profile: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get(':email')
  async getProfile(@Param('email') email: string) {
    return this.profileService.getProfileByEmail(email);
  }

  @Put()
  @UseInterceptors(FileFieldsInterceptor([
    { name: 'facePhoto', maxCount: 1 },
    { name: 'fullBodyPhoto', maxCount: 1 },
    { name: 'thirdPhoto', maxCount: 1 },
    { name: 'additionalPhotos', maxCount: 10 }
  ]))
  async updateProfile(
    @Body() updateProfileDto: UpdateProfileDto,
    @UploadedFiles() files: {
      facePhoto?: Express.Multer.File[];
      fullBodyPhoto?: Express.Multer.File[];
      thirdPhoto?: Express.Multer.File[];
      additionalPhotos?: Express.Multer.File[];
    }
  ) {
    try {
      return await this.profileService.updateProfileWithFiles(updateProfileDto, files);
    } catch (error) {
      throw new HttpException(
        `Failed to update profile: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Delete(':email')
  async deleteProfile(@Param('email') email: string) {
    return this.profileService.deleteProfile(email);
  }

  @Post('submit')
  async submitForReview(@Body() submitDto: SubmitProfileDto) {
    return this.profileService.submitForReviewByEmail(submitDto.email);
  }
}
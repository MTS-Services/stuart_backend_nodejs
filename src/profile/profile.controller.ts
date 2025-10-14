import { Controller, Post, Get, Put, Delete, Body, Param, UseInterceptors, UploadedFiles } from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { ProfileService } from './profile.service';
import { CreateProfileDto, UpdateProfileDto, SubmitProfileDto, ProfileResponseDto } from './profile.dto';

const storage = diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = join(process.cwd(), 'uploads', 'profiles');
    if (!existsSync(uploadPath)) {
      mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const fileExtension = extname(file.originalname);
    cb(null, `${file.fieldname}-${uniqueSuffix}${fileExtension}`);
  },
});

@Controller('profile')
export class ProfileController {
  constructor(private profileService: ProfileService) {}

  @Post()
  @UseInterceptors(FileFieldsInterceptor([
    { name: 'facePhoto', maxCount: 1 },
    { name: 'fullBodyPhoto', maxCount: 1 },
    { name: 'thirdPhoto', maxCount: 1 },
    { name: 'additionalPhotos', maxCount: 10 },
  ], { storage }))
  async createProfile(@Body() createProfileDto: CreateProfileDto, @UploadedFiles() files: any) {
    return this.profileService.createProfileWithFiles(createProfileDto, files);
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
    { name: 'additionalPhotos', maxCount: 10 },
  ], { storage }))
  async updateProfile(@Body() updateProfileDto: UpdateProfileDto, @UploadedFiles() files: any) {
    return this.profileService.updateProfileWithFiles(updateProfileDto, files);
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
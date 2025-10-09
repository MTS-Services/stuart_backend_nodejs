import { 
  Controller, 
  Post, 
  Get, 
  Put, 
  Delete, 
  Body, 
  UseGuards, 
  Request, 
  Param,
  HttpException,
  HttpStatus,
  UseInterceptors,
  UploadedFile
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { FileInterceptor } from '@nestjs/platform-express';
import { ProfileService } from './profile.service';
import { CreateProfileDto, UpdateProfileDto, UploadPhotoDto } from './profile.dto';
import type { Express } from 'express';

@Controller('profile')
@UseGuards(AuthGuard('jwt'))
export class ProfileController {
  constructor(private profileService: ProfileService) {}

  @Post()
  async createProfile(@Request() req, @Body() createProfileDto: CreateProfileDto) {
    return this.profileService.createProfile(req.user.id, createProfileDto);
  }

  @Get()
  async getProfile(@Request() req) {
    return this.profileService.getProfile(req.user.id);
  }

  @Put()
  async updateProfile(@Request() req, @Body() updateProfileDto: UpdateProfileDto) {
    return this.profileService.updateProfile(req.user.id, updateProfileDto);
  }

  @Post('photo')
  @UseInterceptors(FileInterceptor('file'))
  async uploadPhoto(
    @Request() req, 
    @UploadedFile() file: Express.Multer.File,
    @Body() metadata?: { photoType?: string; isMain?: string }
  ) {
    try {
      if (!file) {
        throw new HttpException('No file uploaded', HttpStatus.BAD_REQUEST);
      }

      // You can implement actual file storage here (AWS S3, local storage, etc.)
      const photoUrl = `uploads/${Date.now()}-${file.originalname}`;
      const photoType = (metadata?.photoType as 'face' | 'fullBody' | 'additional') || 'face';

      const result = await this.profileService.uploadPhoto(
        req.user.id,
        photoType,
        photoUrl
      );

      return {
        success: true,
        message: 'Photo uploaded successfully',
        data: result,
        fileInfo: {
          originalName: file.originalname,
          mimetype: file.mimetype,
          size: file.size,
          photoUrl: photoUrl
        }
      };
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  @Delete('photo/:photoUrl')
  async deletePhoto(@Request() req, @Param('photoUrl') photoUrl: string) {
    // URL decode the photo URL
    const decodedUrl = decodeURIComponent(photoUrl);
    return this.profileService.deletePhoto(req.user.id, decodedUrl);
  }

  @Post('submit')
  async submitForReview(@Request() req) {
    return this.profileService.submitForReview(req.user.id);
  }
}
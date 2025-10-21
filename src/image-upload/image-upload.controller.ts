import { Controller, Post, UseGuards, UploadedFile, UploadedFiles, UseInterceptors, BadRequestException } from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { ImageUploadService } from './image-upload.service';
import { AuthGuard } from '@nestjs/passport';

@Controller('upload')
@UseGuards(AuthGuard('jwt'))
export class ImageUploadController {
  constructor(private readonly imageUploadService: ImageUploadService) {}

  @Post('single')
  @UseInterceptors(FileInterceptor('file'))
  async uploadSingle(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    // Validate file type
    if (!file.mimetype.startsWith('image/')) {
      throw new BadRequestException('Only image files are allowed');
    }

    return this.imageUploadService.uploadImage(file);
  }

  @Post('multiple')
  @UseInterceptors(FilesInterceptor('files', 10)) // Maximum 10 files
  async uploadMultiple(@UploadedFiles() files: Express.Multer.File[]) {
    if (!files || files.length === 0) {
      throw new BadRequestException('No files uploaded');
    }

    // Validate all files are images
    const invalidFiles = files.filter(file => !file.mimetype.startsWith('image/'));
    if (invalidFiles.length > 0) {
      throw new BadRequestException('Only image files are allowed');
    }

    return this.imageUploadService.uploadMultipleImages(files);
  }
}
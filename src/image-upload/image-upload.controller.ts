import { Controller, Post, UseGuards, UploadedFile, UploadedFiles, UseInterceptors, BadRequestException } from '@nestjs/common';
import { FileInterceptor, FilesInterceptor, FileFieldsInterceptor } from '@nestjs/platform-express';
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

    // Check if file has either buffer or path
    if (!file.buffer && !file.path) {
      throw new BadRequestException('One or more files were uploaded but missing temporary path. Upload may have failed.');
    }

    // Validate file type
    if (!file.mimetype.startsWith('image/')) {
      throw new BadRequestException('Only image files are allowed');
    }

    return this.imageUploadService.uploadImage(file);
  }  @Post('multiple')
  @UseInterceptors(FilesInterceptor('files', 10)) // Maximum 10 files
  async uploadMultiple(@UploadedFiles() files: Express.Multer.File[]) {
    if (!files || files.length === 0) {
      throw new BadRequestException('No files uploaded');
    }

    // Check if files have either buffer or path
    const invalidFiles = files.filter(file => !file.buffer && !file.path);
    if (invalidFiles.length > 0) {
      throw new BadRequestException('One or more files were uploaded but missing temporary path. Upload may have failed.');
    }

    // Validate all files are images
    const nonImageFiles = files.filter(file => !file.mimetype.startsWith('image/'));
    if (nonImageFiles.length > 0) {
      throw new BadRequestException('Only image files are allowed');
    }

    return this.imageUploadService.uploadMultipleImages(files);
  }
}

import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { ImageUploadController } from './image-upload.controller';
import { ImageUploadService } from './image-upload.service';

@Module({
  imports: [
    MulterModule.register({
      // 🚨 TEMPORARY: NO storage defined means files are stored in memory (buffer), 
       // but they will NOT have a 'path', which will trigger an error in the service,
       // but should bypass the *Multer write failure* error from the controller.
      storage: undefined, 
    }),
  ],
  controllers: [ImageUploadController],
  providers: [ImageUploadService],
  exports: [ImageUploadService],
})
export class ImageUploadModule {}
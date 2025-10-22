import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import axios from 'axios';
import FormData from 'form-data';
import { createReadStream, promises as fs } from 'fs'; // Import promises as fs
import { join } from 'path';

@Injectable()
export class ImageUploadService {
  private readonly uploadServiceUrl: string;

  constructor() {
    const serviceUrl = process.env.IMAGE_UPLOAD_SERVICE_URL;
    if (!serviceUrl) {
      console.warn('⚠️ IMAGE_UPLOAD_SERVICE_URL not configured in .env');
    }
    this.uploadServiceUrl = serviceUrl || 'https://img.mtscorporate.com';
  }

  // Helper function to delete the temporary file
  private async cleanupTempFile(filePath: string) {
    if (filePath) {
      try {
        await fs.unlink(filePath);
      } catch (e) {
        console.error(`Failed to delete temporary file at ${filePath}:`, e.message);
        // Do not throw, cleanup is secondary to the main request logic
      }
    }
  }

  async uploadImage(file: Express.Multer.File): Promise<{ url: string }> {
    // 🛑 CRITICAL FIX: Ensure file object and path exist
    if (!file || !file.path) {
      // This is now caught early in the Controller, but kept here as a fallback
      throw new Error(`File object or its temporary path is missing. This usually means no file was uploaded.`); 
    }

    let result;
    try {
      if (!this.uploadServiceUrl) {
        throw new HttpException(
          'Image upload service URL not configured',
          HttpStatus.INTERNAL_SERVER_ERROR
        );
      }

      const formData = new FormData();
      // Create a read stream from the file path
      const stream = createReadStream(file.path);
      formData.append('file', stream, {
        filename: file.originalname,
        contentType: file.mimetype,
      });

      const response = await axios.post(`${this.uploadServiceUrl}/upload`, formData, {
        headers: {
          ...formData.getHeaders(),
        },
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
      });

      if (response.data && response.data.url) {
        result = { url: response.data.url };
        return result;
      } else {
        throw new Error('Invalid response from upload service');
      }
    } catch (error) {
      console.error('Image upload failed:', error.message);
      throw new HttpException(
        `Image upload failed: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    } finally {
      // ✅ CRITICAL FIX: Clean up the temporary file
      await this.cleanupTempFile(file.path); 
    }
  }

  async uploadMultipleImages(files: Express.Multer.File[]): Promise<{ urls: string[] }> {
    // Filter out any potential null/undefined entries and those missing a path
    const validFiles = files ? files.filter(file => file && file.path) : [];

    if (validFiles.length === 0) {
      return { urls: [] };
    }
    
    // Use Promise.allSettled to ensure all cleanup runs even if one upload fails
    const uploadPromises = validFiles.map(file => this.uploadImage(file));
    const results = await Promise.allSettled(uploadPromises);
    
    // Check for failures and collect successful URLs
    const failedUploads = results.filter(r => r.status === 'rejected');
    if (failedUploads.length > 0) {
        const errorMessages = failedUploads.map(r => (r as PromiseRejectedResult).reason.message).join('; ');
        throw new HttpException(
            `One or more uploads failed: ${errorMessages}`,
            HttpStatus.INTERNAL_SERVER_ERROR
        );
    }

    return {
      urls: (results as PromiseFulfilledResult<any>[]).map(result => result.value.url)
    };
  }
}
import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import axios from 'axios';
import FormData from 'form-data';
import { createReadStream, promises as fs } from 'fs';
import { join } from 'path';
import { Readable } from 'stream';

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

  // Helper function to ensure URL is HTTP (not HTTPS) to avoid SSL certificate issues
  private ensureHttpUrl(url: string): string {
    if (!url) return url;
    
    // If URL starts with https://, replace with http://
    if (url.startsWith('https://')) {
      const httpUrl = url.replace('https://', 'http://');
      console.log(`[Image Upload] Converted HTTPS to HTTP: ${httpUrl}`);
      return httpUrl;
    }
    
    // If already HTTP or relative URL, return as is
    return url;
  }

  async uploadImage(file: Express.Multer.File): Promise<{ url: string }> {
    // 🛑 CRITICAL FIX: Handle both memory storage (buffer) and disk storage (path)
    if (!file) {
      throw new Error('No file provided');
    }

    // Check if we have either buffer (memory storage) or path (disk storage)
    if (!file.buffer && !file.path) {
      throw new Error('File object is missing both buffer and path. Upload may have failed.');
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
      
      // Handle both memory storage (buffer) and disk storage (path)
      if (file.buffer) {
        // Memory storage - create stream from buffer
        const stream = Readable.from(file.buffer);
        formData.append('image', stream, {
          filename: file.originalname,
          contentType: file.mimetype,
          knownLength: file.size,
        });
      } else if (file.path) {
        // Disk storage - create stream from file path
        const stream = createReadStream(file.path);
        formData.append('image', stream, {
          filename: file.originalname,
          contentType: file.mimetype,
        });
      }

      const response = await axios.post(`${this.uploadServiceUrl}/upload-single`, formData, {
        headers: {
          ...formData.getHeaders(),
        },
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
      });

      if (response.data && response.data.url) {
        // Ensure URL is HTTP (not HTTPS) to avoid certificate issues
        const imageUrl = this.ensureHttpUrl(response.data.url);
        result = { url: imageUrl };
        return result;
      } else if (response.data && response.data.file && response.data.file.url) {
        // Handle the structure from your Express.js service: { file: { url: "..." } }
        // Ensure URL is HTTP (not HTTPS) to avoid certificate issues
        const imageUrl = this.ensureHttpUrl(response.data.file.url);
        result = { url: imageUrl };
        return result;
      } else {
        console.error('Upload response:', response.data);
        throw new Error('Invalid response from upload service');
      }
    } catch (error) {
      console.error('Image upload failed:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        url: `${this.uploadServiceUrl}/upload-single`
      });
      throw new HttpException(
        `Image upload failed: ${error.response?.data?.message || error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    } finally {
      // ✅ CRITICAL FIX: Clean up the temporary file only if using disk storage
      if (file.path) {
        await this.cleanupTempFile(file.path); 
      }
    }
  }

  async uploadMultipleImages(files: Express.Multer.File[]): Promise<{ urls: string[] }> {
    // Filter out any potential null/undefined entries and validate files
    const validFiles = files ? files.filter(file => {
      if (!file) return false;
      // Check if we have either buffer (memory storage) or path (disk storage)
      return file.buffer || file.path;
    }) : [];

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
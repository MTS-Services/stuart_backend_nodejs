import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import axios from 'axios';
import FormData from 'form-data';
import { createReadStream } from 'fs';

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

  async uploadImage(file: Express.Multer.File): Promise<{ url: string }> {
    try {
      if (!this.uploadServiceUrl) {
        throw new HttpException(
          'Image upload service URL not configured',
          HttpStatus.INTERNAL_SERVER_ERROR
        );
      }

      const formData = new FormData();
      // Create a read stream from the buffer
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
        return { url: response.data.url };
      } else {
        throw new Error('Invalid response from upload service');
      }
    } catch (error) {
      console.error('Image upload failed:', error.message);
      throw new HttpException(
        `Image upload failed: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  async uploadMultipleImages(files: Express.Multer.File[]): Promise<{ urls: string[] }> {
    try {
      const uploadPromises = files.map(file => this.uploadImage(file));
      const results = await Promise.all(uploadPromises);
      return {
        urls: results.map(result => result.url)
      };
    } catch (error) {
      console.error('Multiple image upload failed:', error.message);
      throw new HttpException(
        `Multiple image upload failed: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
}
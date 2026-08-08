import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { promises as fs } from 'fs';
import { extname } from 'path';
import { randomUUID } from 'crypto';
// heic-convert is CommonJS
// eslint-disable-next-line @typescript-eslint/no-require-imports
const convert = require('heic-convert');

@Injectable()
export class ImageUploadService {
  private readonly s3: S3Client;
  private readonly bucket: string;
  private readonly publicUrl: string;

  constructor() {
    const accountId = process.env.R2_ACCOUNT_ID;
    const accessKeyId = process.env.R2_ACCESS_KEY_ID;
    const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
    const endpoint =
      process.env.R2_ENDPOINT ||
      (accountId
        ? `https://${accountId}.r2.cloudflarestorage.com`
        : undefined);

    this.bucket = process.env.R2_BUCKET || 'scanmemaybe';
    this.publicUrl = (
      process.env.R2_PUBLIC_URL ||
      'https://pub-fb4b624d2ae84e94ae04587cbe0dfc94.r2.dev'
    ).replace(/\/$/, '');

    if (!accessKeyId || !secretAccessKey || !endpoint) {
      console.warn(
        '⚠️ R2 credentials not fully configured. Set R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, and R2_ENDPOINT (or R2_ACCOUNT_ID).',
      );
    }

    this.s3 = new S3Client({
      region: 'auto',
      endpoint,
      credentials: {
        accessKeyId: accessKeyId || '',
        secretAccessKey: secretAccessKey || '',
      },
    });
  }

  private async cleanupTempFile(filePath: string) {
    if (!filePath) return;
    try {
      await fs.unlink(filePath);
    } catch (e) {
      console.error(
        `Failed to delete temporary file at ${filePath}:`,
        e.message,
      );
    }
  }

  private async getFileBuffer(file: Express.Multer.File): Promise<Buffer> {
    if (file.buffer) {
      return file.buffer;
    }
    if (file.path) {
      return fs.readFile(file.path);
    }
    throw new Error('File object is missing both buffer and path.');
  }

  private isHeicFile(file: Express.Multer.File): boolean {
    const mime = (file.mimetype || '').toLowerCase();
    const name = (file.originalname || '').toLowerCase();
    return (
      mime === 'image/heic' ||
      mime === 'image/heif' ||
      mime.includes('heic') ||
      mime.includes('heif') ||
      name.endsWith('.heic') ||
      name.endsWith('.heif')
    );
  }

  private buildObjectKey(originalName: string, forceExt?: string): string {
    const extension =
      forceExt || extname(originalName || '').toLowerCase() || '.bin';
    const safeBase =
      (originalName || 'file')
        .replace(extname(originalName || ''), '')
        .replace(/[^a-zA-Z0-9_-]/g, '')
        .slice(0, 40) || 'file';
    return `uploads/${Date.now()}-${randomUUID().slice(0, 8)}-${safeBase}${extension}`;
  }

  private getPublicObjectUrl(key: string): string {
    return `${this.publicUrl}/${key}`;
  }

  private async prepareUploadBuffer(
    file: Express.Multer.File,
  ): Promise<{ body: Buffer; contentType: string; key: string }> {
    let body = await this.getFileBuffer(file);
    let contentType = file.mimetype || 'application/octet-stream';
    let key = this.buildObjectKey(file.originalname);

    if (this.isHeicFile(file)) {
      try {
        console.log(`[R2] Converting HEIC/HEIF to JPEG: ${file.originalname}`);
        const jpegBuffer = await convert({
          buffer: body,
          format: 'JPEG',
          quality: 0.9,
        });
        body = Buffer.from(jpegBuffer);
        contentType = 'image/jpeg';
        key = this.buildObjectKey(file.originalname, '.jpg');
      } catch (error) {
        console.error(
          `[R2] HEIC conversion failed for ${file.originalname}:`,
          error.message,
        );
        throw new Error(
          `Failed to convert HEIC/HEIF image "${file.originalname}". Please export as JPG/PNG and try again.`,
        );
      }
    }

    return { body, contentType, key };
  }

  async uploadImage(file: Express.Multer.File): Promise<{ url: string }> {
    if (!file) {
      throw new Error('No file provided');
    }

    if (!file.buffer && !file.path) {
      throw new Error(
        'File object is missing both buffer and path. Upload may have failed.',
      );
    }

    if (!process.env.R2_ACCESS_KEY_ID || !process.env.R2_SECRET_ACCESS_KEY) {
      throw new HttpException(
        'R2 storage is not configured',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    try {
      const { body, contentType, key } = await this.prepareUploadBuffer(file);

      await this.s3.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: key,
          Body: body,
          ContentType: contentType,
        }),
      );

      return { url: this.getPublicObjectUrl(key) };
    } catch (error) {
      console.error('R2 image upload failed:', {
        message: error.message,
        name: error.name,
        bucket: this.bucket,
        file: file.originalname,
        mimetype: file.mimetype,
      });
      throw new HttpException(
        `Image upload failed: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    } finally {
      if (file.path) {
        await this.cleanupTempFile(file.path);
      }
    }
  }

  async deleteImage(urlOrKey: string): Promise<boolean> {
    if (!urlOrKey) return false;

    try {
      const key = urlOrKey.startsWith('http')
        ? urlOrKey.replace(`${this.publicUrl}/`, '')
        : urlOrKey;

      await this.s3.send(
        new DeleteObjectCommand({
          Bucket: this.bucket,
          Key: key,
        }),
      );
      return true;
    } catch (error) {
      console.error('R2 image delete failed:', error.message);
      return false;
    }
  }

  async uploadMultipleImages(
    files: Express.Multer.File[],
  ): Promise<{ urls: string[] }> {
    const validFiles = files
      ? files.filter((file) => file && (file.buffer || file.path))
      : [];

    if (validFiles.length === 0) {
      return { urls: [] };
    }

    const results = await Promise.allSettled(
      validFiles.map((file) => this.uploadImage(file)),
    );

    const failedUploads = results.filter((r) => r.status === 'rejected');
    if (failedUploads.length > 0) {
      const errorMessages = failedUploads
        .map((r) => (r as PromiseRejectedResult).reason.message)
        .join('; ');
      throw new HttpException(
        `One or more uploads failed: ${errorMessages}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    return {
      urls: (
        results as PromiseFulfilledResult<{ url: string }>[]
      ).map((result) => result.value.url),
    };
  }
}

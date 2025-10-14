import { 
  IsOptional, 
  IsNumber, 
  IsString, 
  IsIn, 
  IsUrl, 
  IsEmail,
  Min,
  Max,
  MaxLength,
  IsArray,
  ArrayMaxSize
} from 'class-validator';
import { Transform, Type } from 'class-transformer';

// Base profile creation DTO for form-data
export class CreateProfileDto {
  @IsString()
  @IsEmail()
  email: string; // Required for email-based access

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(18)
  @Max(100)
  age?: number;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  height?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  bio?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  location?: string;
}

// Update profile DTO - all fields optional except email
export class UpdateProfileDto {
  @IsString()
  @IsEmail()
  email: string; // Required for identification

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(18)
  @Max(100)
  age?: number;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  height?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  bio?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  location?: string;
}

// Photo management DTOs
export class UploadPhotoDto {
  @IsIn(['face', 'fullBody', 'third', 'additional'])
  photoType: 'face' | 'fullBody' | 'third' | 'additional';

  @IsUrl()
  photoUrl: string;
}

export class DeletePhotoDto {
  @IsString()
  @IsEmail()
  email: string;

  @IsIn(['face', 'fullBody', 'third', 'additional'])
  photoType: 'face' | 'fullBody' | 'third' | 'additional';

  @IsOptional()
  @IsNumber()
  additionalPhotoIndex?: number; // For deleting specific additional photos
}

export class SubmitProfileDto {
  @IsString()
  @IsEmail()
  email: string;
}

// Response DTOs
export class ProfileResponseDto {
  id: number;
  userId: number;
  age?: number;
  height?: string;
  bio?: string;
  location?: string;
  facePhoto?: string;
  fullBodyPhoto?: string;
  thirdPhoto?: string;
  additionalPhotos: string[];
  status: string;
  photoCount: number;
  isComplete: boolean; // Has minimum required photos
  createdAt: Date;
  updatedAt: Date;
}
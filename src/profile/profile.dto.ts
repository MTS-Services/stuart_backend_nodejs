// profile.dto.ts

import { 
    IsOptional, 
    IsNumber, 
    IsString, 
    IsEmail,
    Min,
    Max,
    MaxLength,
    IsArray,
    ArrayMaxSize,
    ArrayMinSize, // <-- New Import
    IsNotEmpty,
    ValidateNested // <-- New Import
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { PartialType } from '@nestjs/mapped-types'; // or '@nestjs/swagger' if you use it

// DTO for a single image reference (assuming you save the URL/Path)
class ImageReferenceDto {
    @IsString()
    @IsNotEmpty({ message: 'Image URL/path cannot be empty.' })
    url: string;
}

// Base profile creation DTO for form-data
export class CreateProfileDto {
    @IsString()
    @IsEmail()
    email: string; // Required for email-based access

        @IsString()
    @IsOptional()
    @Transform(({ value }) => (value === '' ? undefined : value))
    @IsEmail()
    gmail?: string;

    @IsNumber()
    @Type(() => Number) // Ensure conversion from form-data string
    userId: number; // User ID for profile association

    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    @Min(18)
    @Max(100)
    age?: number;

    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    @Min(1)
    @Max(12)
    birthMonth?: number; // Birth month (1-12)

    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    @Min(1900)
    @Max(new Date().getFullYear() - 18)
    birthYear?: number; // Birth year

    @IsOptional()
    @IsString()
    @MaxLength(20)
    height?: string; // Format: "5'10"" (feet'inches")

    @IsOptional()
    @IsString()
    @MaxLength(5000)
    bio?: string;

    @IsOptional()
    @IsString()
    @MaxLength(100)
    location?: string;

    @IsOptional()
    @IsString()
    @MaxLength(20)
    startDate?: string; // Date as string format

    @IsOptional()
    @IsString()
    @MaxLength(20)
    endDate?: string; // Date as string format

    @IsOptional()
    @IsString()
    @MaxLength(200)
    dealbreakers?: string; // Dealbreakers field

    @IsString()
    @MaxLength(100)
    bodyType: string; // REQUIRED FIELD

    @IsString()
    @MaxLength(100)
    county: string; // REQUIRED FIELD - County

    @IsString()
    @MaxLength(50)
    displayName: string; // REQUIRED FIELD

    @IsOptional()
    @IsString()
    @MaxLength(50)
    username?: string; // USERNAME FIELD

    @IsOptional()
    @IsString()
    @Transform(({ value }) => (value === '' ? undefined : value))
    @MaxLength(20)
    phone?: string;

    // -------------------------------------------------------------------
    // 🔥 CONSOLIDATED IMAGE FIELD 🔥
    // Replaces facePhoto, fullBodyPhoto, thirdPhoto, and additionalPhotos
    // -------------------------------------------------------------------
    @IsArray({ message: 'Images must be provided as an array.' })
    @ArrayMinSize(3, { message: 'You must upload a minimum of 3 images.' }) // MIN 3 REQUIRED
    @ArrayMaxSize(13, { message: 'You can upload a maximum of 13 images.' }) // MAX 13 LIMIT
    @ValidateNested({ each: true })
    @Type(() => ImageReferenceDto)
    image: ImageReferenceDto[]; 
    // -------------------------------------------------------------------
    
    // -------------------------------------------------------------------
    // 🔥 NEW IMAGES JSON FIELD 🔥
    // Optional JSON field for structured image data
    // -------------------------------------------------------------------
    @IsOptional()
    images?: {
        face?: string;
        fullbody?: string;
        toothyGrin?: string;
        extras?: { [key: string]: string };
    };
}

// Update profile DTO - all fields optional except email
export class UpdateProfileDto extends PartialType(CreateProfileDto) {
    // Overrides 'image' from PartialType to ensure all image array constraints apply on update
    // Note: Since this extends PartialType(CreateProfileDto), the base fields (like email) 
    // are already optional unless explicitly redefined. However, it's often clearer 
    // to define required update fields directly or use a specific update structure.
    
    // Making the image array optional for updates, but keeping the min/max validation 
    // if the array IS provided.
    @IsOptional()
    @IsArray({ message: 'Images must be provided as an array.' })
    @ArrayMinSize(3, { message: 'If providing images, a minimum of 3 is required.' })
    @ArrayMaxSize(13, { message: 'If providing images, a maximum of 13 is allowed.' })
    @ValidateNested({ each: true })
    @Type(() => ImageReferenceDto)
    image?: ImageReferenceDto[];
    
    // -------------------------------------------------------------------
    // 🔥 NEW IMAGES JSON FIELD (Optional for updates) 🔥
    // -------------------------------------------------------------------
    @IsOptional()
    @Transform(({ value }) => {
      if (typeof value === 'string') {
        try {
          return JSON.parse(value);
        } catch {
          return value;
        }
      }
      return value;
    })
    images?: {
        face?: string;
        fullbody?: string;
        toothyGrin?: string;
        extras?: { [key: string]: string };
    };
    
    // -------------------------------------------------------------------
    // 🔥 IMAGE UPDATE MODE 🔥
    // Controls how images are updated: 'merge' (default) or 'replace'
    // -------------------------------------------------------------------
    @IsOptional()
    @IsString()
    imageUpdateMode?: 'merge' | 'replace';

    @IsOptional()
    @IsString()
    adminEdit?: string; // 'true' when admin is editing (comes as string from FormData)
}

// Photo management DTOs are simplified/removed as they are no longer needed
// The upload/delete logic should now refer to the 'image' field by index or URL.

export class SubmitProfileDto {
    @IsString()
    @IsEmail()
    email: string;
}

// Response DTOs
export class ProfileResponseDto {
    id: number;
    userId: number;
    age?: string;
    height?: string;
    bio?: string;
    location?: string;
    username?: string; // USERNAME FIELD
    imageUrls?: string[]; // Changed from 'images' to avoid conflict
    imagesJson?: { // Changed to be more descriptive
        face?: string;
        fullbody?: string;
        toothyGrin?: string;
        extras?: { [key: string]: string };
    };
    status: string;
    photoCount: number;
    isComplete: boolean;
    createdAt: Date;
    updatedAt: Date;
}
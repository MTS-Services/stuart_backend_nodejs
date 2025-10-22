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

    @IsString()
    @MaxLength(100)
    bodyType: string; // REQUIRED FIELD

    @IsString()
    @MaxLength(100)
    area: string; // REQUIRED FIELD

    @IsString()
    @MaxLength(50)
    displayName: string; // REQUIRED FIELD

    @IsString()
    @MaxLength(20)
    phone: string; // REQUIRED FIELD

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
    age?: number;
    height?: string;
    bio?: string;
    location?: string;
    // Consolidated image field
    images: ImageReferenceDto[]; 
    status: string;
    photoCount: number;
    isComplete: boolean; // Has minimum required photos
    createdAt: Date;
    updatedAt: Date;
}
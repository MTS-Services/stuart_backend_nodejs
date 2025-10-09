import { IsOptional, IsNumber, IsString, IsIn, IsUrl } from 'class-validator';

export class CreateProfileDto {
  @IsOptional()
  @IsNumber()
  age?: number;

  @IsOptional()
  @IsString()
  height?: string;

  @IsOptional()
  @IsString()
  bio?: string;

  @IsOptional()
  @IsString()
  location?: string;
}

export class UpdateProfileDto {
  @IsOptional()
  @IsNumber()
  age?: number;

  @IsOptional()
  @IsString()
  height?: string;

  @IsOptional()
  @IsString()
  bio?: string;

  @IsOptional()
  @IsString()
  location?: string;
}

export class UploadPhotoDto {
  @IsIn(['face', 'fullBody', 'additional'])
  photoType: 'face' | 'fullBody' | 'additional';

  @IsUrl()
  photoUrl: string;
}
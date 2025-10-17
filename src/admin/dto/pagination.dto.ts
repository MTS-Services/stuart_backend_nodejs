import { IsOptional, IsNumberString, IsString } from 'class-validator';
import { Transform } from 'class-transformer';

export class PaginationDto {
  @IsOptional()
  @Transform(({ value }) => value ? String(value) : '1')
  @IsString()
  page?: string = '1';

  @IsOptional()
  @Transform(({ value }) => value ? String(value) : '10')
  @IsString()
  limit?: string = '10';

  // Helper methods to get numeric values
  getPage(): number {
    return this.page ? parseInt(this.page, 10) || 1 : 1;
  }

  getLimit(): number {
    return this.limit ? parseInt(this.limit, 10) || 10 : 10;
  }
}

export class NotificationPaginationDto extends PaginationDto {
  @IsOptional()
  @Transform(({ value }) => value ? String(value) : '20')
  @IsString()
  limit?: string = '20';

  getLimit(): number {
    return this.limit ? parseInt(this.limit, 10) || 20 : 20;
  }
}
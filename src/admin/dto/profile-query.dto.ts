import { IsOptional, IsString, IsIn } from 'class-validator';
import { Transform } from 'class-transformer';

export class ProfileQueryDto {
  @IsOptional()
  @IsString()
  @IsIn(['ALL', 'PENDING', 'APPROVED', 'REJECTED', 'DRAFT'])
  status?: string = 'ALL';

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
    return this.page ? Math.max(1, parseInt(this.page, 10) || 1) : 1;
  }

  getLimit(): number {
    return this.limit ? Math.max(1, Math.min(100, parseInt(this.limit, 10) || 10)) : 10;
  }

  getStatus(): string {
    return this.status || 'ALL';
  }
}
export class ProfileQueryDto {
  status?: string = 'ALL';
  page?: string = '1';
  limit?: string = '10';

  // Helper methods to get numeric values
  getPage(): number {
    return this.page ? Math.max(1, parseInt(this.page, 10) || 1) : 1;
  }

  getLimit(): number {
    return this.limit ? Math.max(1, Math.min(100, parseInt(this.limit, 10) || 10)) : 10;
  }

  getStatus(): string {
    const validStatuses = ['ALL', 'PENDING', 'APPROVED', 'REJECTED', 'DRAFT'];
    return validStatuses.includes(this.status || '') ? this.status || 'ALL' : 'ALL';
  }
}
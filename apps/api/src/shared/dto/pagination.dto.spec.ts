import { describe, it, expect } from 'vitest';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { PaginationQueryDto, PaginatedResponseDto } from './pagination.dto';

describe('PaginationQueryDto', () => {
  function toDto(plain: Record<string, unknown>): PaginationQueryDto {
    return plainToInstance(PaginationQueryDto, plain);
  }

  describe('defaults', () => {
    it('should apply default page=1 when not provided', () => {
      const dto = toDto({});
      expect(dto.page).toBe(1);
    });

    it('should apply default limit=20 when not provided', () => {
      const dto = toDto({});
      expect(dto.limit).toBe(20);
    });

    it('should apply default sort_order=asc when not provided', () => {
      const dto = toDto({});
      expect(dto.sort_order).toBe('asc');
    });
  });

  describe('valid inputs', () => {
    it('should accept valid page and limit', async () => {
      const dto = toDto({ page: 3, limit: 50 });
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
      expect(dto.page).toBe(3);
      expect(dto.limit).toBe(50);
    });

    it('should accept valid sort_by and sort_order', async () => {
      const dto = toDto({ sort_by: 'created_at', sort_order: 'desc' });
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
      expect(dto.sort_by).toBe('created_at');
      expect(dto.sort_order).toBe('desc');
    });

    it('should accept page=1 (minimum)', async () => {
      const dto = toDto({ page: 1 });
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should accept limit=1 (minimum)', async () => {
      const dto = toDto({ limit: 1 });
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should accept limit=100 (maximum)', async () => {
      const dto = toDto({ limit: 100 });
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });
  });

  describe('invalid inputs', () => {
    it('should reject page < 1', async () => {
      const dto = toDto({ page: 0 });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      const pageErrors = errors.filter((e) => e.property === 'page');
      expect(pageErrors.length).toBeGreaterThan(0);
    });

    it('should reject negative page', async () => {
      const dto = toDto({ page: -5 });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should reject limit > 100', async () => {
      const dto = toDto({ limit: 101 });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      const limitErrors = errors.filter((e) => e.property === 'limit');
      expect(limitErrors.length).toBeGreaterThan(0);
    });

    it('should reject limit < 1', async () => {
      const dto = toDto({ limit: 0 });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should reject invalid sort_order', async () => {
      const dto = toDto({ sort_order: 'invalid' });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      const sortErrors = errors.filter((e) => e.property === 'sort_order');
      expect(sortErrors.length).toBeGreaterThan(0);
    });
  });
});

describe('PaginatedResponseDto', () => {
  it('should create a paginated response with correct metadata', () => {
    const items = [{ id: '1' }, { id: '2' }, { id: '3' }];
    const query = plainToInstance(PaginationQueryDto, { page: 1, limit: 20 });

    const result = PaginatedResponseDto.create(items, 50, query);

    expect(result.data).toEqual(items);
    expect(result.meta.page).toBe(1);
    expect(result.meta.limit).toBe(20);
    expect(result.meta.total).toBe(50);
    expect(result.meta.totalPages).toBe(3);
  });

  it('should calculate totalPages correctly with exact division', () => {
    const query = plainToInstance(PaginationQueryDto, { page: 1, limit: 10 });
    const result = PaginatedResponseDto.create([], 30, query);

    expect(result.meta.totalPages).toBe(3);
  });

  it('should calculate totalPages correctly with remainder', () => {
    const query = plainToInstance(PaginationQueryDto, { page: 1, limit: 10 });
    const result = PaginatedResponseDto.create([], 31, query);

    expect(result.meta.totalPages).toBe(4);
  });

  it('should return totalPages=0 when total is 0', () => {
    const query = plainToInstance(PaginationQueryDto, { page: 1, limit: 20 });
    const result = PaginatedResponseDto.create([], 0, query);

    expect(result.meta.totalPages).toBe(0);
    expect(result.data).toEqual([]);
  });

  it('should preserve generic type in data array', () => {
    interface Basket {
      id: string;
      name: string;
    }

    const items: Basket[] = [
      { id: '1', name: 'Morning Basket' },
      { id: '2', name: 'Afternoon Basket' },
    ];
    const query = plainToInstance(PaginationQueryDto, { page: 1, limit: 20 });

    const result = PaginatedResponseDto.create(items, 2, query);

    expect(result.data[0]?.name).toBe('Morning Basket');
    expect(result.data[1]?.name).toBe('Afternoon Basket');
  });
});

import { Module } from '@nestjs/common';

/**
 * SharedModule exports shared providers, filters, and interceptors.
 *
 * Filters and interceptors are registered globally in main.ts.
 * This module exists as a central import point and can host shared
 * services in the future (e.g., a PaginationService, a CacheService).
 */
@Module({})
export class SharedModule {}

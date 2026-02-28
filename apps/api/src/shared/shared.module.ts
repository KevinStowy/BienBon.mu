import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service';

/**
 * SharedModule exports shared providers, filters, and interceptors.
 *
 * Filters and interceptors are registered globally in main.ts.
 * PrismaService is provided globally so all modules can inject it
 * without explicit imports.
 */
@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class SharedModule {}

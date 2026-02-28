import { Global, Module } from '@nestjs/common';

/**
 * SharedModule exports shared providers, filters, and interceptors.
 *
 * Filters and interceptors are registered globally in main.ts.
 * PrismaService is provided globally by PrismaModule (apps/api/src/prisma/).
 */
@Global()
@Module({
  providers: [],
  exports: [],
})
export class SharedModule {}

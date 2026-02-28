import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client';

/**
 * NestJS-aware Prisma client with PostgreSQL driver adapter (Prisma 7).
 * Connects on module init and disconnects on module destroy.
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);
  private readonly pool: Pool;

  constructor() {
    const connectionString = process.env['DATABASE_URL'] ?? 'postgresql://postgres:password@localhost:5432/bienbon';
    const pool = new Pool({ connectionString });
    const adapter = new PrismaPg(pool);
    super({ adapter });
    this.pool = pool;
  }

  async onModuleInit(): Promise<void> {
    try {
      await this.$connect();
      this.logger.log('Database connection established');
    } catch {
      this.logger.warn('Failed to connect to database — running without DB');
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
    await this.pool.end();
  }
}

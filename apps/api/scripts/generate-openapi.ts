/**
 * Generate OpenAPI spec from NestJS Swagger decorators.
 * Outputs to packages/api-contract/openapi.json.
 *
 * Usage: cd apps/api && node --require @swc/register scripts/generate-openapi.ts
 *   or:  cd apps/api && npx nest build && node dist/scripts/generate-openapi.js
 *
 * Recommended: run `npm run generate:openapi` from apps/api
 */
import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter } from '@nestjs/platform-fastify';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { writeFileSync } from 'fs';
import { resolve } from 'path';
import { AppModule } from '../src/app.module';

async function generate(): Promise<void> {
  const app = await NestFactory.create(AppModule, new FastifyAdapter(), {
    logger: ['warn', 'error'],
  });

  const config = new DocumentBuilder()
    .setTitle('BienBon.mu API')
    .setDescription('Food waste reduction platform for Mauritius')
    .setVersion('0.1.0')
    .addBearerAuth()
    .addServer('http://localhost:3000', 'Local development')
    .build();

  const document = SwaggerModule.createDocument(app, config);

  const outputPath = resolve(__dirname, '../../../packages/api-contract/openapi.json');
  writeFileSync(outputPath, JSON.stringify(document, null, 2));

  console.log(`OpenAPI spec written to ${outputPath}`);
  console.log(`  Paths: ${Object.keys(document.paths ?? {}).length}`);
  console.log(`  Schemas: ${Object.keys(document.components?.schemas ?? {}).length}`);

  await app.close();
}

generate().catch((err: unknown) => {
  console.error('Failed to generate OpenAPI spec:', err);
  process.exit(1);
});

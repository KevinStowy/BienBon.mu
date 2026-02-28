import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { describe, it, expect, beforeEach } from 'vitest';
import { HealthController } from './health.controller';

describe('HealthController', () => {
  let controller: HealthController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
    }).compile();

    controller = module.get<HealthController>(HealthController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getHealth', () => {
    it('should return health status', () => {
      const result = controller.getHealth();

      expect(result.status).toBe('ok');
      expect(result.service).toBe('bienbon-api');
      expect(result.version).toBe('0.1.0');
      expect(result.timestamp).toBeDefined();
    });

    it('should return a valid ISO timestamp', () => {
      const result = controller.getHealth();
      const date = new Date(result.timestamp);

      expect(date.toISOString()).toBe(result.timestamp);
    });
  });

  describe('getReadiness', () => {
    it('should return readiness status with checks', () => {
      const result = controller.getReadiness();

      expect(result.status).toBe('ok');
      expect(result.timestamp).toBeDefined();
      expect(result.checks).toBeDefined();
      expect(result.checks.database).toBe('ok');
      expect(result.checks.redis).toBe('ok');
    });

    it('should return a valid ISO timestamp', () => {
      const result = controller.getReadiness();
      const date = new Date(result.timestamp);

      expect(date.toISOString()).toBe(result.timestamp);
    });
  });
});

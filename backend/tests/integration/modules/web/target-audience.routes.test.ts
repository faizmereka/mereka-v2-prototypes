import { TargetAudience } from '@core/models/TargetAudience';
import type { FastifyInstance } from 'fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { buildApp } from '@/app';

describe('Target Audience Routes Integration Tests', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();
  });

  afterAll(async () => {
    await TargetAudience.deleteMany({});
    await app.close();
  });

  beforeEach(async () => {
    await TargetAudience.deleteMany({});
  });

  describe('POST /api/v1/target-audiences', () => {
    it('should create a new target audience', async () => {
      const audienceData = {
        name: 'Students',
        description: 'University and college students',
        isActive: true,
        priority: 1,
      };

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/target-audiences',
        payload: audienceData,
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.name).toBe('Students');
    });

    it('should return 400 for duplicate name', async () => {
      const audienceData = { name: 'Professionals' };

      await app.inject({
        method: 'POST',
        url: '/api/v1/target-audiences',
        payload: audienceData,
      });

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/target-audiences',
        payload: audienceData,
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error.message).toContain('already exists');
    });
  });

  describe('GET /api/v1/target-audiences', () => {
    beforeEach(async () => {
      await TargetAudience.create([
        { name: 'Students', isActive: true, priority: 1 },
        { name: 'Professionals', isActive: true, priority: 2 },
        { name: 'Retirees', isActive: false, priority: 3 },
      ]);
    });

    it('should list all audiences', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/target-audiences',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data.length).toBe(3);
    });

    it('should filter by isActive', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/target-audiences?isActive=true',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data.length).toBe(2);
    });
  });

  describe('GET /api/v1/target-audiences/active', () => {
    beforeEach(async () => {
      await TargetAudience.create([
        { name: 'Active 1', isActive: true },
        { name: 'Active 2', isActive: true },
        { name: 'Inactive', isActive: false },
      ]);
    });

    it('should list only active audiences', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/target-audiences/active',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data.length).toBe(2);
      expect(body.data.every((a: { isActive: boolean }) => a.isActive)).toBe(true);
    });
  });
});

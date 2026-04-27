import { Expertise } from '@core/models/Expertise';
import { Hub } from '@core/models/Hub';
import { User } from '@core/models/User';
import type { FastifyInstance } from 'fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { buildApp } from '@/app';

import {
  createMinimalExpertiseData,
  setupExpertiseTestEnvironment,
  VALID_EXPERTISE_DATA,
} from '../../../fixtures/expertise.fixture';

describe('Expertise Routes', () => {
  let app: FastifyInstance;
  let userId: string;
  let hubId: string;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    // Clear collections
    await Promise.all([Expertise.deleteMany({}), Hub.deleteMany({}), User.deleteMany({})]);

    // Setup test environment
    const testEnv = await setupExpertiseTestEnvironment();
    userId = testEnv.userId;
    hubId = testEnv.hubId;
  });

  describe('POST /api/v1/expertises', () => {
    it('should create expertise successfully', async () => {
      const payload = {
        ...VALID_EXPERTISE_DATA,
        hubId,
        createdBy: userId,
      };

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/expertises',
        payload,
      });

      expect(response.statusCode).toBe(201);
      const data = JSON.parse(response.body);
      expect(data.success).toBe(true);
      expect(data.data.expertiseTitle).toBe(payload.expertiseTitle);
      expect(data.data.slug).toBe(payload.slug);
      expect(data.data.status).toBe('draft');
    });

    it('should return 400 if required fields are missing', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/expertises',
        payload: {
          expertiseTitle: 'Test',
          // Missing other required fields
        },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should return 409 if slug already exists', async () => {
      const payload = createMinimalExpertiseData(hubId, userId);

      // Create first expertise
      await app.inject({
        method: 'POST',
        url: '/api/v1/expertises',
        payload,
      });

      // Try to create with same slug
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/expertises',
        payload,
      });

      expect(response.statusCode).toBe(409);
      const data = JSON.parse(response.body);
      expect(data.success).toBe(false);
      expect(data.error.message).toContain('already exists');
    });

    it('should validate expertise title length', async () => {
      const payload = {
        ...createMinimalExpertiseData(hubId, userId),
        expertiseTitle: 'a'.repeat(201), // Exceeds max length of 200
      };

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/expertises',
        payload,
      });

      expect(response.statusCode).toBe(400);
    });

    it('should validate slug format', async () => {
      const payload = {
        ...createMinimalExpertiseData(hubId, userId),
        slug: 'Invalid Slug With Spaces', // Invalid format
      };

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/expertises',
        payload,
      });

      expect(response.statusCode).toBe(400);
    });

    it('should create expertise with minimal required fields', async () => {
      const payload = createMinimalExpertiseData(hubId, userId);

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/expertises',
        payload,
      });

      expect(response.statusCode).toBe(201);
      const data = JSON.parse(response.body);
      expect(data.success).toBe(true);
      expect(data.data.expertiseTitle).toBe(payload.expertiseTitle);
    });
  });

  describe('PUT /api/v1/expertises/:id', () => {
    let expertiseId: string;

    beforeEach(async () => {
      // Create an expertise first
      const createResponse = await app.inject({
        method: 'POST',
        url: '/api/v1/expertises',
        payload: createMinimalExpertiseData(hubId, userId),
      });
      const createData = JSON.parse(createResponse.body);
      expertiseId = createData.data._id;
    });

    it('should update expertise successfully', async () => {
      const updatedPayload = {
        ...createMinimalExpertiseData(hubId, userId),
        expertiseTitle: 'Updated Title',
        expertiseDescription: 'Updated description',
      };

      const response = await app.inject({
        method: 'PUT',
        url: `/api/v1/expertises/${expertiseId}`,
        payload: updatedPayload,
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.success).toBe(true);
      expect(data.data.expertiseTitle).toBe('Updated Title');
      expect(data.data.expertiseDescription).toBe('Updated description');
    });

    it('should return 404 if expertise not found', async () => {
      const response = await app.inject({
        method: 'PUT',
        url: '/api/v1/expertises/507f1f77bcf86cd799439011',
        payload: createMinimalExpertiseData(hubId, userId),
      });

      expect(response.statusCode).toBe(404);
    });

    it('should update expertise status', async () => {
      const updatedPayload = {
        ...createMinimalExpertiseData(hubId, userId),
        status: 'published',
      };

      const response = await app.inject({
        method: 'PUT',
        url: `/api/v1/expertises/${expertiseId}`,
        payload: updatedPayload,
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.data.status).toBe('published');
    });
  });

  describe('GET /api/v1/expertises/:id', () => {
    let expertiseId: string;

    beforeEach(async () => {
      const createResponse = await app.inject({
        method: 'POST',
        url: '/api/v1/expertises',
        payload: createMinimalExpertiseData(hubId, userId),
      });
      const createData = JSON.parse(createResponse.body);
      expertiseId = createData.data._id;
    });

    it('should get expertise by id', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/expertises/${expertiseId}`,
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.success).toBe(true);
      expect(data.data._id).toBe(expertiseId);
    });

    it('should return 404 for non-existent expertise', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/expertises/507f1f77bcf86cd799439011',
      });

      expect(response.statusCode).toBe(404);
    });

    it('should return 400 for invalid expertise id', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/expertises/invalid-id',
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe('GET /api/v1/expertises', () => {
    beforeEach(async () => {
      // Create multiple expertises
      await Promise.all([
        app.inject({
          method: 'POST',
          url: '/api/v1/expertises',
          payload: {
            ...createMinimalExpertiseData(hubId, userId),
            expertiseTitle: 'Expertise 1',
            slug: 'expertise-1',
            status: 'published',
          },
        }),
        app.inject({
          method: 'POST',
          url: '/api/v1/expertises',
          payload: {
            ...createMinimalExpertiseData(hubId, userId),
            expertiseTitle: 'Expertise 2',
            slug: 'expertise-2',
            status: 'draft',
          },
        }),
        app.inject({
          method: 'POST',
          url: '/api/v1/expertises',
          payload: {
            ...createMinimalExpertiseData(hubId, userId),
            expertiseTitle: 'Expertise 3',
            slug: 'expertise-3',
            status: 'published',
          },
        }),
      ]);
    });

    it('should query expertises with default pagination', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/expertises',
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.success).toBe(true);
      expect(data.data).toBeInstanceOf(Array);
      expect(data.data.length).toBe(3);
      expect(data.meta).toEqual({
        page: 1,
        limit: 20,
        total: 3,
        totalPages: 1,
      });
    });

    it('should filter expertises by status', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/expertises?status=published',
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.data.length).toBe(2);
      expect(data.data.every((e: any) => e.status === 'published')).toBe(true);
    });

    it('should filter expertises by hubId', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/expertises?hubId=${hubId}`,
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.data.length).toBe(3);
    });

    it('should filter expertises by createdBy', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/expertises?createdBy=${userId}`,
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.data.length).toBe(3);
    });

    it('should support pagination', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/expertises?page=1&limit=2',
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.data.length).toBe(2);
      expect(data.meta.totalPages).toBe(2);
    });

    it('should support sorting by createdAt', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/expertises?sortBy=createdAt&sortOrder=asc',
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      const dates = data.data.map((e: any) => new Date(e.createdAt).getTime());

      // Check if dates are in ascending order
      for (let i = 1; i < dates.length; i++) {
        expect(dates[i]).toBeGreaterThanOrEqual(dates[i - 1]);
      }
    });

    it('should filter by isDisabled', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/expertises?isDisabled=false',
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.data.every((e: any) => e.isDisabled === false)).toBe(true);
    });
  });

  describe('DELETE /api/v1/expertises/:id', () => {
    let expertiseId: string;

    beforeEach(async () => {
      const createResponse = await app.inject({
        method: 'POST',
        url: '/api/v1/expertises',
        payload: createMinimalExpertiseData(hubId, userId),
      });
      const createData = JSON.parse(createResponse.body);
      expertiseId = createData.data._id;
    });

    it('should delete expertise successfully', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: `/api/v1/expertises/${expertiseId}`,
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.success).toBe(true);
      expect(data.message).toBe('Expertise deleted successfully');

      // Verify it's actually deleted
      const getResponse = await app.inject({
        method: 'GET',
        url: `/api/v1/expertises/${expertiseId}`,
      });
      expect(getResponse.statusCode).toBe(404);
    });

    it('should return 404 for non-existent expertise', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: '/api/v1/expertises/507f1f77bcf86cd799439011',
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe('PATCH /api/v1/expertises/:id/publish', () => {
    let expertiseId: string;

    beforeEach(async () => {
      const createResponse = await app.inject({
        method: 'POST',
        url: '/api/v1/expertises',
        payload: createMinimalExpertiseData(hubId, userId),
      });
      const createData = JSON.parse(createResponse.body);
      expertiseId = createData.data._id;
    });

    it('should publish expertise successfully', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: `/api/v1/expertises/${expertiseId}/publish`,
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.success).toBe(true);
      expect(data.data.status).toBe('published');
    });

    it('should return 404 for non-existent expertise', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: '/api/v1/expertises/507f1f77bcf86cd799439011/publish',
      });

      expect(response.statusCode).toBe(404);
    });

    it('should update updatedAt timestamp when publishing', async () => {
      const beforePublish = await Expertise.findById(expertiseId);
      const beforeTimestamp = beforePublish?.updatedAt;

      // Wait a bit to ensure timestamp difference
      await new Promise((resolve) => setTimeout(resolve, 10));

      await app.inject({
        method: 'PATCH',
        url: `/api/v1/expertises/${expertiseId}/publish`,
      });

      const afterPublish = await Expertise.findById(expertiseId);
      const afterTimestamp = afterPublish?.updatedAt;

      expect(afterTimestamp?.getTime()).toBeGreaterThan(beforeTimestamp?.getTime() ?? 0);
    });
  });

  describe('PATCH /api/v1/expertises/:id/archive', () => {
    let expertiseId: string;

    beforeEach(async () => {
      const createResponse = await app.inject({
        method: 'POST',
        url: '/api/v1/expertises',
        payload: createMinimalExpertiseData(hubId, userId),
      });
      const createData = JSON.parse(createResponse.body);
      expertiseId = createData.data._id;
    });

    it('should archive expertise successfully', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: `/api/v1/expertises/${expertiseId}/archive`,
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.success).toBe(true);
      expect(data.data.status).toBe('archived');
    });

    it('should return 404 for non-existent expertise', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: '/api/v1/expertises/507f1f77bcf86cd799439011/archive',
      });

      expect(response.statusCode).toBe(404);
    });

    it('should update updatedAt timestamp when archiving', async () => {
      const beforeArchive = await Expertise.findById(expertiseId);
      const beforeTimestamp = beforeArchive?.updatedAt;

      // Wait a bit to ensure timestamp difference
      await new Promise((resolve) => setTimeout(resolve, 10));

      await app.inject({
        method: 'PATCH',
        url: `/api/v1/expertises/${expertiseId}/archive`,
      });

      const afterArchive = await Expertise.findById(expertiseId);
      const afterTimestamp = afterArchive?.updatedAt;

      expect(afterTimestamp?.getTime()).toBeGreaterThan(beforeTimestamp?.getTime() ?? 0);
    });
  });

  describe('Complex validation scenarios', () => {
    it('should validate nested location schema', async () => {
      const payload = {
        ...createMinimalExpertiseData(hubId, userId),
        location: {
          streetAddress: '', // Invalid - empty
          country: 'Malaysia',
          state: 'KL',
          city: 'KL',
          postcode: '50000',
          location: 'Downtown',
          lat: 3.139,
          lng: 101.6869,
        },
      };

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/expertises',
        payload,
      });

      expect(response.statusCode).toBe(400);
    });

    it('should validate ticket array has at least one ticket', async () => {
      const payload = {
        ...createMinimalExpertiseData(hubId, userId),
        ticket: [], // Invalid - empty array
      };

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/expertises',
        payload,
      });

      expect(response.statusCode).toBe(400);
    });

    it('should validate cover photo is a valid URL', async () => {
      const payload = {
        ...createMinimalExpertiseData(hubId, userId),
        coverPhoto: 'invalid-url', // Invalid URL
      };

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/expertises',
        payload,
      });

      expect(response.statusCode).toBe(400);
    });

    it('should accept valid complete expertise data', async () => {
      const payload = {
        ...VALID_EXPERTISE_DATA,
        hubId,
        createdBy: userId,
      };

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/expertises',
        payload,
      });

      expect(response.statusCode).toBe(201);
      const data = JSON.parse(response.body);
      expect(data.success).toBe(true);
      expect(data.data.location).toBeDefined();
      expect(data.data.operatingHours).toBeDefined();
      expect(data.data.customQuestions).toBeDefined();
    });
  });
});

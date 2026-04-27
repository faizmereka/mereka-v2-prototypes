import { ExperienceTheme } from '@core/models/ExperienceTheme';
import { ExperienceTopic } from '@core/models/ExperienceTopic';
import type { FastifyInstance } from 'fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { buildApp } from '@/app';

describe('Experience Topic Routes Integration Tests', () => {
  let app: FastifyInstance;
  let themeId: string;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();
  });

  afterAll(async () => {
    await ExperienceTopic.deleteMany({});
    await ExperienceTheme.deleteMany({});
    await app.close();
  });

  beforeEach(async () => {
    // Clean up
    await ExperienceTopic.deleteMany({});
    await ExperienceTheme.deleteMany({});

    // Create a theme for testing
    const theme = await ExperienceTheme.create({
      name: 'Test Theme',
      description: 'Theme for testing',
      isActive: true,
    });
    themeId = String(theme._id);
  });

  describe('POST /api/v1/experience-topics', () => {
    it('should create a new experience topic', async () => {
      const topicData = {
        name: 'Painting',
        parentCategory: themeId,
        isActive: true,
        priority: 1,
      };

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/experience-topics',
        payload: topicData,
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.name).toBe('Painting');
      expect(body.data.parentCategory).toBe(themeId);
    });

    it('should return 400 for duplicate topic name within same theme', async () => {
      const topicData = {
        name: 'Drawing',
        parentCategory: themeId,
      };

      // Create first topic
      const firstResponse = await app.inject({
        method: 'POST',
        url: '/api/v1/experience-topics',
        payload: topicData,
      });

      // Verify first creation succeeded
      expect(firstResponse.statusCode).toBe(201);

      // Try to create duplicate
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/experience-topics',
        payload: topicData,
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      expect(body.error.message).toContain('already exists');
    });
  });

  describe('GET /api/v1/experience-topics/:id', () => {
    it('should get topic by ID with populated theme', async () => {
      // Create a topic
      const createResponse = await app.inject({
        method: 'POST',
        url: '/api/v1/experience-topics',
        payload: {
          name: 'Sculpture',
          parentCategory: themeId,
        },
      });

      const createBody = JSON.parse(createResponse.body);
      const topicId = createBody.data._id || createBody.data.id;

      // Get the topic
      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/experience-topics/${topicId}`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.name).toBe('Sculpture');
    });

    it('should return 404 for non-existent topic', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/experience-topics/507f1f77bcf86cd799439011',
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe('GET /api/v1/experience-topics', () => {
    beforeEach(async () => {
      // Create test topics
      await ExperienceTopic.create([
        { name: 'Topic 1', parentCategory: themeId, isActive: true, priority: 1 },
        { name: 'Topic 2', parentCategory: themeId, isActive: true, priority: 2 },
        { name: 'Topic 3', parentCategory: themeId, isActive: false, priority: 3 },
      ]);
    });

    it('should list all topics', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/experience-topics',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.length).toBe(3);
    });

    it('should filter by themeId', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/experience-topics?themeId=${themeId}`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.length).toBe(3);
    });

    it('should filter by isActive', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/experience-topics?isActive=true',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data.length).toBe(2);
    });
  });

  describe('PATCH /api/v1/experience-topics/:id', () => {
    it('should update topic', async () => {
      // Create a topic
      const createResponse = await app.inject({
        method: 'POST',
        url: '/api/v1/experience-topics',
        payload: {
          name: 'Original Topic',
          parentCategory: themeId,
        },
      });

      const createBody = JSON.parse(createResponse.body);
      const topicId = createBody.data._id || createBody.data.id;

      // Update the topic
      const response = await app.inject({
        method: 'PATCH',
        url: `/api/v1/experience-topics/${topicId}`,
        payload: {
          name: 'Updated Topic',
          priority: 10,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.name).toBe('Updated Topic');
      expect(body.data.priority).toBe(10);
    });
  });

  describe('DELETE /api/v1/experience-topics/:id', () => {
    it('should soft delete topic', async () => {
      // Create a topic
      const createResponse = await app.inject({
        method: 'POST',
        url: '/api/v1/experience-topics',
        payload: {
          name: 'To Be Deleted',
          parentCategory: themeId,
          isActive: true,
        },
      });

      const createBody = JSON.parse(createResponse.body);
      const topicId = createBody.data._id || createBody.data.id;

      // Delete the topic
      const response = await app.inject({
        method: 'DELETE',
        url: `/api/v1/experience-topics/${topicId}`,
      });

      expect(response.statusCode).toBe(200);

      // Verify topic is soft deleted
      const topic = await ExperienceTopic.findById(topicId);
      expect(topic?.isActive).toBe(false);
    });
  });
});

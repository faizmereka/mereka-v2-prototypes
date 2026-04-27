import { ExperienceTheme } from '@core/models/ExperienceTheme';
import type { FastifyInstance } from 'fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { buildApp } from '@/app';

describe('Experience Theme Routes Integration Tests', () => {
  let app: FastifyInstance;
  let createdThemeId: string;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();
  });

  afterAll(async () => {
    await ExperienceTheme.deleteMany({});
    await app.close();
  });

  beforeEach(async () => {
    // Clean up before each test
    await ExperienceTheme.deleteMany({});
  });

  describe('POST /api/v1/experience-themes', () => {
    it('should create a new experience theme', async () => {
      const themeData = {
        name: 'Art & Creativity',
        description: 'Explore your creative side through various art forms',
        icon: 'palette',
        isActive: true,
        priority: 1,
      };

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/experience-themes',
        payload: themeData,
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.name).toBe('Art & Creativity');
      expect(body.data.description).toBe('Explore your creative side through various art forms');
      expect(body.data.icon).toBe('palette');
      expect(body.data.count).toBe(0);

      createdThemeId = body.data._id;
    });

    it('should return 400 for duplicate theme name', async () => {
      const themeData = {
        name: 'Music',
        description: 'Music experiences',
        isActive: true,
      };

      // Create first theme
      await app.inject({
        method: 'POST',
        url: '/api/v1/experience-themes',
        payload: themeData,
      });

      // Try to create duplicate
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/experience-themes',
        payload: themeData,
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      expect(body.error.message).toContain('already exists');
    });

    it('should return 400 for invalid name (too short)', async () => {
      const themeData = {
        name: '',
        description: 'Test',
      };

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/experience-themes',
        payload: themeData,
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe('GET /api/v1/experience-themes/:id', () => {
    it('should get theme by ID', async () => {
      // Create a theme first
      const createResponse = await app.inject({
        method: 'POST',
        url: '/api/v1/experience-themes',
        payload: {
          name: 'Technology',
          description: 'Tech experiences',
        },
      });

      const createdTheme = JSON.parse(createResponse.body).data;

      // Get the theme
      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/experience-themes/${createdTheme._id}`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.name).toBe('Technology');
    });

    it('should return 404 for non-existent theme', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/experience-themes/507f1f77bcf86cd799439011',
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe('GET /api/v1/experience-themes', () => {
    beforeEach(async () => {
      // Create test themes
      await ExperienceTheme.create([
        { name: 'Art', description: 'Art experiences', isActive: true, priority: 1 },
        { name: 'Music', description: 'Music experiences', isActive: true, priority: 2 },
        { name: 'Sports', description: 'Sports experiences', isActive: false, priority: 3 },
      ]);
    });

    it('should list all themes', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/experience-themes',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.length).toBe(3);
      expect(body.meta.total).toBe(3);
    });

    it('should filter by isActive=true', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/experience-themes?isActive=true',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.length).toBe(2);
      expect(body.data.every((theme: { isActive: boolean }) => theme.isActive)).toBe(true);
    });

    it('should paginate results', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/experience-themes?page=1&limit=2',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data.length).toBe(2);
      expect(body.meta.page).toBe('1'); // Query params are strings
      expect(body.meta.limit).toBe('2');
      expect(body.meta.totalPages).toBe(2); // This is calculated as number
    });
  });

  describe('GET /api/v1/experience-themes/active', () => {
    beforeEach(async () => {
      await ExperienceTheme.create([
        { name: 'Active Theme 1', isActive: true, priority: 1 },
        { name: 'Active Theme 2', isActive: true, priority: 2 },
        { name: 'Inactive Theme', isActive: false, priority: 3 },
      ]);
    });

    it('should list only active themes', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/experience-themes/active',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.length).toBe(2);
      expect(body.data.every((theme: { isActive: boolean }) => theme.isActive)).toBe(true);
    });
  });

  describe('PATCH /api/v1/experience-themes/:id', () => {
    it('should update theme', async () => {
      // Create a theme
      const createResponse = await app.inject({
        method: 'POST',
        url: '/api/v1/experience-themes',
        payload: {
          name: 'Original Name',
          description: 'Original description',
        },
      });

      expect(createResponse.statusCode).toBe(201);
      const createBody = JSON.parse(createResponse.body);
      const themeId = createBody.data._id || createBody.data.id;
      expect(themeId).toBeDefined();

      // Update the theme
      const response = await app.inject({
        method: 'PATCH',
        url: `/api/v1/experience-themes/${themeId}`,
        payload: {
          name: 'Updated Name',
          description: 'Updated description',
          priority: 5,
        },
      });

      if (response.statusCode !== 200) {
        console.error('Update failed:', JSON.parse(response.body));
      }

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.name).toBe('Updated Name');
      expect(body.data.description).toBe('Updated description');
      expect(body.data.priority).toBe(5);
    });

    it('should return 400 for duplicate name when updating', async () => {
      // Create two themes
      const themes = await ExperienceTheme.create([
        { name: 'Theme A', description: 'Theme A' },
        { name: 'Theme B', description: 'Theme B' },
      ]);
      const themeB = themes[1];
      if (!themeB) throw new Error('Theme B not created');

      // Try to update Theme B to have Theme A's name
      const response = await app.inject({
        method: 'PATCH',
        url: `/api/v1/experience-themes/${String(themeB._id)}`,
        payload: {
          name: 'Theme A',
        },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      expect(body.error.message).toContain('already exists');
    });
  });

  describe('DELETE /api/v1/experience-themes/:id', () => {
    it('should soft delete theme (set isActive to false)', async () => {
      // Create a theme
      const createResponse = await app.inject({
        method: 'POST',
        url: '/api/v1/experience-themes',
        payload: {
          name: 'To Be Deleted',
          description: 'This will be deleted',
          isActive: true,
        },
      });

      expect(createResponse.statusCode).toBe(201);
      const createBody = JSON.parse(createResponse.body);
      const themeId = createBody.data._id || createBody.data.id;
      expect(themeId).toBeDefined();

      // Delete the theme
      const response = await app.inject({
        method: 'DELETE',
        url: `/api/v1/experience-themes/${themeId}`,
      });

      if (response.statusCode !== 200) {
        console.error('Delete failed:', JSON.parse(response.body));
      }

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);

      // Verify theme is soft deleted
      const theme = await ExperienceTheme.findById(themeId);
      expect(theme?.isActive).toBe(false);
    });

    it('should return 400 for non-existent theme', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: '/api/v1/experience-themes/507f1f77bcf86cd799439011',
      });

      expect(response.statusCode).toBe(400);
    });
  });
});

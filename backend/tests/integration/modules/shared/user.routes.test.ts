import { User } from '@core/models/User';

import type { FastifyInstance } from 'fastify';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { buildApp } from '@/app';

describe('User Routes Integration Tests', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /api/v1/users', () => {
    it('should create a new user', async () => {
      const userData = {
        email: 'newuser@example.com',
        name: 'New User',
        role: 'user',
      };

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/users',
        payload: userData,
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.email).toBe('newuser@example.com');
      expect(body.data.name).toBe('New User');
    });

    it('should return 400 for duplicate email', async () => {
      const userData = {
        email: 'duplicate@example.com',
        name: 'Duplicate User',
        role: 'user',
      };

      // Create first user
      await app.inject({
        method: 'POST',
        url: '/api/v1/users',
        payload: userData,
      });

      // Try to create duplicate
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/users',
        payload: userData,
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      expect(body.error.message).toContain('already exists');
    });

    it('should return 400 for invalid email', async () => {
      const userData = {
        email: 'invalid-email',
        name: 'Test User',
        role: 'user',
      };

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/users',
        payload: userData,
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
    });
  });

  describe('GET /api/v1/users', () => {
    beforeAll(async () => {
      // Create test users
      await User.create([
        { email: 'list1@example.com', name: 'List User 1', role: 'user' },
        { email: 'list2@example.com', name: 'List User 2', role: 'admin' },
        { email: 'list3@example.com', name: 'List User 3', role: 'user' },
      ]);
    });

    it('should get paginated users', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/users?page=1&limit=2',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.length).toBeLessThanOrEqual(2);
      expect(body.meta.pagination).toBeDefined();
    });

    it('should filter users by role', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/users?role=admin',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);

      expect(body.data.every((user: { role: string }) => user.role === 'admin')).toBe(true);
    });
  });

  describe('GET /api/v1/users/:id', () => {
    it('should get user by ID', async () => {
      const user = await User.create({
        email: 'getid@example.com',
        name: 'Get By ID User',
        role: 'user',
      });

      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/users/${String(user._id)}`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.email).toBe('getid@example.com');
    });

    it('should return 404 for non-existent user', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/users/507f1f77bcf86cd799439011',
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
    });
  });

  describe('PATCH /api/v1/users/:id', () => {
    it('should update user', async () => {
      const user = await User.create({
        email: 'update@example.com',
        name: 'Original Name',
        role: 'user',
      });

      const response = await app.inject({
        method: 'PATCH',
        url: `/api/v1/users/${String(user._id)}`,
        payload: {
          name: 'Updated Name',
          bio: 'New bio',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.name).toBe('Updated Name');
      expect(body.data.bio).toBe('New bio');
    });

    it('should return 404 for non-existent user', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: '/api/v1/users/507f1f77bcf86cd799439011',
        payload: { name: 'New Name' },
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe('DELETE /api/v1/users/:id', () => {
    it('should soft delete user', async () => {
      const user = await User.create({
        email: 'delete@example.com',
        name: 'To Be Deleted',
        role: 'user',
      });

      const response = await app.inject({
        method: 'DELETE',
        url: `/api/v1/users/${String(user._id)}`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);

      // Verify user is soft deleted
      const deletedUser = await User.findById(user._id);
      expect(deletedUser?.status).toBe('inactive');
    });

    it('should return 404 for non-existent user', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: '/api/v1/users/507f1f77bcf86cd799439011',
      });

      expect(response.statusCode).toBe(404);
    });
  });
});

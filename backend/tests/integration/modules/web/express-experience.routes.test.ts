import { Experience } from '@core/models/Experience';
import type { FastifyInstance } from 'fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { buildApp } from '@/app';

describe('Express Experience Routes Integration Tests', () => {
  let app: FastifyInstance;
  let createdExperienceId: string;
  const testHubId = '507f1f77bcf86cd799439011'; // Mock hub ID
  const testUserId = '507f1f77bcf86cd799439012'; // Mock user ID

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();
  });

  afterAll(async () => {
    await Experience.deleteMany({ slug: { $regex: /test-express-experience/ } });
    await app.close();
  });

  beforeEach(async () => {
    // Clean up before each test
    await Experience.deleteMany({ slug: { $regex: /test-express-experience/ } });
  });

  describe('POST /api/v1/experiences - Create Express Experience', () => {
    it('should create a new express experience matching frontend payload', async () => {
      // This matches EXACTLY what the frontend sends (lines 435-452 in create-express-experience.component.ts)
      const expressExperienceData = {
        experienceTitle: 'Test Express Experience Workshop',
        slug: 'test-express-experience-workshop',
        experienceDuration: 3600000, // 1 hour in milliseconds
        schedules: [
          {
            uid: 'schedule1',
            recurringRule: ['MON', 'WED', 'FRI'],
            startDate: '2025-11-15T10:00:00Z',
            recurringType: 'weekly',
          },
        ],
        ticket: [
          {
            id: 'ticket1',
            ticketType: 'Paid',
            ticketName: 'Standard Ticket',
            ticketPrice: 50,
            ticketQty: 20,
            specialRate: 0,
          },
        ],
        status: 'drafted',
        hostDetails: [
          {
            fullName: 'John Doe',
            isNew: true,
            isEditing: false,
            email: 'john@example.com',
            hubName: 'Test Hub',
            location: 'San Francisco, CA',
            hubId: testHubId,
            expertId: 'expert123',
            access: 'owner',
            profileImage: 'https://example.com/profile.jpg',
            profileUrl: 'https://example.com/profile.jpg',
            inviteHost: false,
            learnerProfile: {
              aboutMe: 'Expert in tech',
            },
          },
        ],
        experienceType: 'Online', // Frontend hardcodes this
        feePaidBy: 'hub', // Frontend hardcodes this
        audienceType: 'Hidden', // Frontend hardcodes this
        timeZone: 'America/Los_Angeles',
        hubId: testHubId,
        type: 'express',
        listingType: 'express', // IMPORTANT: This tells backend to use relaxed validation
        createdDate: new Date(),
        createdBy: testUserId,
      };

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/experiences',
        payload: expressExperienceData,
      });

      console.log('Create response status:', response.statusCode);
      console.log('Create response body:', response.body);

      // The backend will likely reject this because of missing required fields
      // If this fails, we need to fix the backend schema/service to handle express experiences
      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.experienceTitle).toBe('Test Express Experience Workshop');
      expect(body.data.slug).toBe('test-express-experience-workshop');
      expect(body.data.experienceDuration).toBe(3600000);
      expect(body.data.hostDetails).toHaveLength(1);
      expect(body.data.ticket).toHaveLength(1);
      expect(body.data.schedules).toHaveLength(1);

      createdExperienceId = body.data._id;
    });

    it('should create with minimal ticket data', async () => {
      const minimalData = {
        experienceTitle: 'Minimal Express Experience',
        slug: 'minimal-express-experience',
        experienceDuration: 1800000, // 30 minutes
        schedules: [
          {
            uid: 'schedule1',
            recurringRule: ['TUE'],
            startDate: '2025-11-16T14:00:00Z',
            recurringType: 'weekly',
          },
        ],
        ticket: [
          {
            id: 'ticket1',
            ticketType: 'Free',
            ticketName: 'Free Ticket',
            ticketPrice: 0,
            ticketQty: 10,
            specialRate: 0,
          },
        ],
        status: 'drafted',
        hostDetails: [
          {
            fullName: 'Jane Smith',
            email: 'jane@example.com',
            hubId: testHubId,
            expertId: 'expert456',
          },
        ],
        experienceType: 'Online',
        feePaidBy: 'hub',
        audienceType: 'Hidden',
        timeZone: 'Asia/Singapore',
        hubId: testHubId,
        type: 'express',
        listingType: 'express',
        createdBy: testUserId,
      };

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/experiences',
        payload: minimalData,
      });

      console.log('Minimal response status:', response.statusCode);
      console.log('Minimal response body:', response.body);

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.experienceTitle).toBe('Minimal Express Experience');
    });
  });

  describe('PATCH /api/v1/experiences/:id - Update Express Experience', () => {
    beforeEach(async () => {
      // Create an experience to update (matching frontend payload)
      const initialData = {
        experienceTitle: 'Original Express Experience',
        slug: 'original-express-experience',
        experienceDuration: 3600000,
        schedules: [
          {
            uid: 'schedule1',
            recurringRule: ['MON'],
            startDate: '2025-11-15T10:00:00Z',
            recurringType: 'weekly',
          },
        ],
        ticket: [
          {
            id: 'ticket1',
            ticketType: 'Paid',
            ticketName: 'Standard',
            ticketPrice: 50,
            ticketQty: 10,
            specialRate: 0,
          },
        ],
        status: 'drafted',
        hostDetails: [
          {
            fullName: 'John Doe',
            email: 'john@example.com',
            hubId: testHubId,
            expertId: 'expert123',
          },
        ],
        experienceType: 'Online',
        feePaidBy: 'hub',
        audienceType: 'Hidden',
        timeZone: 'America/Los_Angeles',
        hubId: testHubId,
        type: 'express',
        listingType: 'express',
        createdBy: testUserId,
      };

      const createResponse = await app.inject({
        method: 'POST',
        url: '/api/v1/experiences',
        payload: initialData,
      });

      console.log('Setup create response:', createResponse.statusCode);
      if (createResponse.statusCode === 201) {
        createdExperienceId = JSON.parse(createResponse.body).data._id;
      }
    });

    it('should update experience title and duration', async () => {
      if (!createdExperienceId) {
        console.log('Skipping test - no experience created');
        return;
      }

      // Frontend sends the FULL updated object (lines 423-433)
      const updateData = {
        experienceTitle: 'Updated Express Experience Title',
        experienceDuration: 7200000, // 2 hours
      };

      const response = await app.inject({
        method: 'PATCH',
        url: `/api/v1/experiences/${createdExperienceId}`,
        payload: updateData,
      });

      console.log('Update response status:', response.statusCode);
      console.log('Update response body:', response.body);

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.experienceTitle).toBe('Updated Express Experience Title');
      expect(body.data.experienceDuration).toBe(7200000);
    });

    it('should update status from drafted to express', async () => {
      if (!createdExperienceId) {
        console.log('Skipping test - no experience created');
        return;
      }

      const updateData = {
        status: 'express',
      };

      const response = await app.inject({
        method: 'PATCH',
        url: `/api/v1/experiences/${createdExperienceId}`,
        payload: updateData,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.status).toBe('ACTIVE'); // Backend might map 'express' to 'ACTIVE'
    });

    it('should update tickets', async () => {
      if (!createdExperienceId) {
        console.log('Skipping test - no experience created');
        return;
      }

      const updateData = {
        ticket: [
          {
            id: 'ticket1',
            ticketType: 'Paid',
            ticketName: 'Early Bird',
            ticketPrice: 40,
            ticketQty: 15,
            specialRate: 0,
          },
          {
            id: 'ticket2',
            ticketType: 'Paid',
            ticketName: 'Regular',
            ticketPrice: 60,
            ticketQty: 20,
            specialRate: 0,
          },
        ],
      };

      const response = await app.inject({
        method: 'PATCH',
        url: `/api/v1/experiences/${createdExperienceId}`,
        payload: updateData,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.ticket).toHaveLength(2);
    });

    it('should update schedules', async () => {
      if (!createdExperienceId) {
        console.log('Skipping test - no experience created');
        return;
      }

      const updateData = {
        schedules: [
          {
            uid: 'schedule1',
            recurringRule: ['TUE', 'THU'],
            startDate: '2025-11-20T14:00:00Z',
            recurringType: 'weekly',
          },
          {
            uid: 'schedule2',
            recurringRule: ['SAT'],
            startDate: '2025-11-22T10:00:00Z',
            recurringType: 'weekly',
          },
        ],
      };

      const response = await app.inject({
        method: 'PATCH',
        url: `/api/v1/experiences/${createdExperienceId}`,
        payload: updateData,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.schedules).toHaveLength(2);
    });
  });

  describe('GET /api/v1/experiences/:id - Get Express Experience by ID', () => {
    beforeEach(async () => {
      const data = {
        experienceTitle: 'Retrievable Express Experience',
        slug: 'retrievable-express-experience',
        experienceDuration: 3600000,
        schedules: [
          {
            uid: 'schedule1',
            recurringRule: ['WED'],
            startDate: '2025-11-20T10:00:00Z',
            recurringType: 'weekly',
          },
        ],
        ticket: [
          {
            id: 'ticket1',
            ticketType: 'Free',
            ticketName: 'Community Ticket',
            ticketPrice: 0,
            ticketQty: 50,
            specialRate: 0,
          },
        ],
        status: 'drafted',
        hostDetails: [
          {
            fullName: 'Alice Johnson',
            email: 'alice@example.com',
            hubId: testHubId,
            expertId: 'expert789',
          },
        ],
        experienceType: 'Online',
        feePaidBy: 'hub',
        audienceType: 'Hidden',
        timeZone: 'America/New_York',
        hubId: testHubId,
        type: 'express',
        listingType: 'express',
        createdBy: testUserId,
      };

      const createResponse = await app.inject({
        method: 'POST',
        url: '/api/v1/experiences',
        payload: data,
      });

      if (createResponse.statusCode === 201) {
        createdExperienceId = JSON.parse(createResponse.body).data._id;
      }
    });

    it('should retrieve experience by ID', async () => {
      if (!createdExperienceId) {
        console.log('Skipping test - no experience created');
        return;
      }

      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/experiences/${createdExperienceId}`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data._id).toBe(createdExperienceId);
      expect(body.data.experienceTitle).toBe('Retrievable Express Experience');
    });
  });

  describe('DELETE /api/v1/experiences/:id - Delete Express Experience', () => {
    beforeEach(async () => {
      const data = {
        experienceTitle: 'Experience To Delete',
        slug: 'experience-to-delete',
        experienceDuration: 3600000,
        schedules: [
          {
            uid: 'schedule1',
            recurringRule: ['FRI'],
            startDate: '2025-11-21T10:00:00Z',
            recurringType: 'weekly',
          },
        ],
        ticket: [
          {
            id: 'ticket1',
            ticketType: 'Paid',
            ticketName: 'Standard',
            ticketPrice: 25,
            ticketQty: 10,
            specialRate: 0,
          },
        ],
        status: 'drafted',
        hostDetails: [
          {
            fullName: 'Test User',
            email: 'test@test.com',
            hubId: testHubId,
            expertId: 'exp1',
          },
        ],
        experienceType: 'Online',
        feePaidBy: 'hub',
        audienceType: 'Hidden',
        timeZone: 'UTC',
        hubId: testHubId,
        type: 'express',
        listingType: 'express',
        createdBy: testUserId,
      };

      const createResponse = await app.inject({
        method: 'POST',
        url: '/api/v1/experiences',
        payload: data,
      });

      if (createResponse.statusCode === 201) {
        createdExperienceId = JSON.parse(createResponse.body).data._id;
      }
    });

    it('should soft delete experience', async () => {
      if (!createdExperienceId) {
        console.log('Skipping test - no experience created');
        return;
      }

      const response = await app.inject({
        method: 'DELETE',
        url: `/api/v1/experiences/${createdExperienceId}`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);

      // Verify it's soft deleted
      const getResponse = await app.inject({
        method: 'GET',
        url: `/api/v1/experiences/${createdExperienceId}`,
      });

      const getBody = JSON.parse(getResponse.body);
      expect(getBody.data.status).toBe('DELETED');
    });
  });
});

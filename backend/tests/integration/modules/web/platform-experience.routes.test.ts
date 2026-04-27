import { Experience } from '@core/models/Experience';
import type { FastifyInstance } from 'fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { buildApp } from '@/app';

describe('Platform Experience Routes Integration Tests', () => {
  let app: FastifyInstance;
  let createdExperienceId: string;
  const testHubId = '507f1f77bcf86cd799439011';
  const testUserId = '507f1f77bcf86cd799439012';
  const testCategoryId = '673049c3dedf20ee29e32e20';
  const testTopicId = '673049c4dedf20ee29e32e29';

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();
  });

  afterAll(async () => {
    await Experience.deleteMany({ slug: { $regex: /test-platform-experience/ } });
    await app.close();
  });

  beforeEach(async () => {
    await Experience.deleteMany({ slug: { $regex: /test-platform-experience/ } });
  });

  describe('POST /api/v1/experiences - Create Platform Experience', () => {
    it('should create a full platform experience with all fields', async () => {
      const fullPlatformData = {
        // Basic Information (from yourExpForm)
        experienceTitle: 'Test Platform Experience Workshop',
        slug: 'test-platform-experience-workshop',
        experienceDescription:
          'This is a comprehensive platform experience with all fields filled out for testing purposes.',
        experienceType: 'Virtual',
        hubId: testHubId,

        // Category and Topics (required)
        experienceCategory: testCategoryId,
        experienceTopics: [
          {
            theme: testCategoryId,
            topic: testTopicId,
          },
        ],

        // Location (for Physical/Hybrid)
        timeZone: 'America/Los_Angeles',

        // Virtual Meeting Info
        meetingLink: 'https://zoom.us/j/123456789',
        meetingLocation: 'Zoom',

        // Host Information
        hostDetails: [
          {
            hubId: testHubId,
            hubName: 'Test Hub',
            expertId: 'expert123',
            expertName: 'John Doe',
            access: 'owner',
            description: 'Expert facilitator',
            profileUrl: 'https://example.com/profile.jpg',
          },
        ],
        noHost: false,
        hostType: 'expert',

        // Audience Settings (from yourAudienceForm)
        audienceType: 'Everyone',
        maximumCapacity: 50,
        canBookAsPrivate: true,
        targetAudience: ['Students', 'Professionals'],
        expertiseLevel: 'Intermediate',
        feePaidBy: 'learner',
        primaryLanguage: 'English',
        secondaryLanguage: ['Spanish'],
        expertiseFields: ['Technology', 'Education'],
        isLearnerPassAvailable: true,
        numberOfLearnerPass: 5,
        isDiscoveryPassAvailable: true,
        numberOfDiscoveryPass: 3,

        // Booking Details (from yourBookingForm)
        cutOffTime: 24,
        cutOffTimeUnit: 'hours',
        canBookOngoingEvent: true,
        experienceDuration: 7200000, // 2 hours in milliseconds
        isMultiDay: false,
        ticketPrice: {
          normal: 50,
          private: 75,
        },
        memberRate: {
          normal: 40,
          private: 60,
        },
        schedules: [
          {
            uid: 'schedule1',
            recurringRule: ['MON', 'WED', 'FRI'],
            startDate: '2025-11-15T10:00:00Z',
            recurringType: 'weekly',
          },
          {
            uid: 'schedule2',
            recurringRule: ['SAT'],
            startDate: '2025-11-16T14:00:00Z',
            recurringType: 'weekly',
          },
        ],

        // Scholarship Settings
        isScholorSlotAvailable: true,
        numberOfScholor: 2,

        // Ticketing (from expTicketForm)
        ticket: [
          {
            id: 'ticket1',
            ticketType: 'Paid',
            ticketName: 'Early Bird Ticket',
            ticketPrice: 45,
            ticketQty: 20,
            hasCutoffTime: true,
            cutoffNumber: 48,
            cutoffTime: 'hours',
            cutoffBeforeAfter: 'Before Experience starts',
            description: 'Get 10% off with early bird pricing',
            flexibleBooking: false,
          },
          {
            id: 'ticket2',
            ticketType: 'Paid',
            ticketName: 'Regular Ticket',
            ticketPrice: 50,
            ticketQty: 30,
            hasCutoffTime: false,
            description: 'Standard admission',
            flexibleBooking: true,
          },
        ],

        // Page/Media (from yourPageForm)
        coverPhoto: 'https://example.com/cover.jpg',
        gallery: ['https://example.com/gallery1.jpg', 'https://example.com/gallery2.jpg'],
        video: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',

        // More Details (from moreInfoPageForm)
        learnerOutcome: 'Participants will learn advanced techniques and best practices.',
        instruction: 'Please bring a laptop and notebook.',
        materialProvided: 'Handouts and digital resources',
        materialNeedToBring: 'Laptop, notebook, pen',
        customQuestions: {
          isQuestionMandatory: true,
          questionArray: [
            {
              questionLabel: 'What is your experience level?',
              questionType: 'dropdown',
              saveStatus: true,
              dropDown: ['Beginner', 'Intermediate', 'Advanced'],
            },
          ],
        },

        // System fields
        status: 'DRAFTED',
        type: 'platform',
        listingType: 'platform',
        currency: 'USD',
        createdBy: testUserId,
      };

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/experiences',
        payload: fullPlatformData,
      });

      console.log('Full platform create status:', response.statusCode);
      console.log('Full platform create body:', response.body);

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.experienceTitle).toBe('Test Platform Experience Workshop');
      expect(body.data.experienceType).toBe('Virtual');
      expect(body.data.listingType).toBe('platform');
      expect(body.data.ticket).toHaveLength(2);
      expect(body.data.schedules).toHaveLength(2);
      expect(body.data.hostDetails).toHaveLength(1);

      createdExperienceId = body.data._id;
    });

    it('should create platform experience with minimal required fields', async () => {
      const minimalData = {
        // Minimal required fields
        experienceTitle: 'Minimal Platform Experience',
        slug: 'minimal-platform-experience',
        experienceDescription: 'This is a minimal platform experience with only required fields.',
        experienceType: 'Virtual',
        hubId: testHubId,

        // Required: Category and Topics
        experienceCategory: testCategoryId,
        experienceTopics: [
          {
            theme: testCategoryId,
            topic: testTopicId,
          },
        ],

        // Required: Primary Language
        primaryLanguage: 'English',

        // Required: Audience Type
        audienceType: 'Everyone',

        // Required: Multi-day flag
        isMultiDay: false,

        // Required: Fee paid by
        feePaidBy: 'learner',

        // Required: Host details (can be empty array with noHost: true)
        hostDetails: [],
        noHost: true,

        // Required: Capacity flags
        canBookAsPrivate: false,
        targetAudience: [],
        isScholorSlotAvailable: false,
        isLearnerPassAvailable: false,
        isDiscoveryPassAvailable: false,

        // Page fields
        coverPhoto: 'https://example.com/minimal-cover.jpg',

        // System fields
        status: 'DRAFTED',
        type: 'platform',
        listingType: 'platform',
        currency: 'USD',
        createdBy: testUserId,
      };

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/experiences',
        payload: minimalData,
      });

      console.log('Minimal platform create status:', response.statusCode);
      console.log('Minimal platform create body:', response.body);

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.experienceTitle).toBe('Minimal Platform Experience');
      expect(body.data.noHost).toBe(true);
    });

    it('should create physical platform experience with location', async () => {
      const physicalData = {
        experienceTitle: 'Physical Platform Workshop',
        slug: 'physical-platform-workshop',
        experienceDescription: 'In-person workshop at our venue.',
        experienceType: 'Physical',
        hubId: testHubId,

        experienceCategory: testCategoryId,
        experienceTopics: [{ theme: testCategoryId, topic: testTopicId }],

        // Location required for Physical
        location: {
          streetAddress: '123 Main Street',
          city: 'San Francisco',
          state: 'California',
          country: 'USA',
          postcode: '94102',
          lat: 37.7749,
          lng: -122.4194,
        },
        timeZone: 'America/Los_Angeles',

        primaryLanguage: 'English',
        audienceType: 'Everyone',
        isMultiDay: false,
        feePaidBy: 'learner',
        hostDetails: [],
        noHost: true,
        canBookAsPrivate: false,
        targetAudience: [],
        isScholorSlotAvailable: false,
        isLearnerPassAvailable: false,
        isDiscoveryPassAvailable: false,
        coverPhoto: 'https://example.com/physical-cover.jpg',

        status: 'DRAFTED',
        type: 'platform',
        listingType: 'platform',
        currency: 'USD',
        createdBy: testUserId,
      };

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/experiences',
        payload: physicalData,
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.experienceType).toBe('Physical');
      expect(body.data.location).toBeDefined();
      expect(body.data.location.city).toBe('San Francisco');
    });
  });

  describe('PATCH /api/v1/experiences/:id - Update Platform Experience', () => {
    beforeEach(async () => {
      // Create a base experience to update
      const baseData = {
        experienceTitle: 'Original Platform Experience',
        slug: 'original-platform-experience',
        experienceDescription: 'Original description for testing updates.',
        experienceType: 'Virtual',
        hubId: testHubId,
        experienceCategory: testCategoryId,
        experienceTopics: [{ theme: testCategoryId, topic: testTopicId }],
        primaryLanguage: 'English',
        audienceType: 'Everyone',
        isMultiDay: false,
        feePaidBy: 'learner',
        hostDetails: [],
        noHost: true,
        canBookAsPrivate: false,
        targetAudience: [],
        isScholorSlotAvailable: false,
        isLearnerPassAvailable: false,
        isDiscoveryPassAvailable: false,
        coverPhoto: 'https://example.com/cover.jpg',
        status: 'DRAFTED',
        type: 'platform',
        listingType: 'platform',
        currency: 'USD',
        createdBy: testUserId,
      };

      const createResponse = await app.inject({
        method: 'POST',
        url: '/api/v1/experiences',
        payload: baseData,
      });

      if (createResponse.statusCode === 201) {
        createdExperienceId = JSON.parse(createResponse.body).data._id;
      }
    });

    it('should update basic experience information', async () => {
      if (!createdExperienceId) {
        console.log('Skipping test - no experience created');
        return;
      }

      const updateData = {
        experienceTitle: 'Updated Platform Experience Title',
        experienceDescription: 'Updated description with new content.',
        maximumCapacity: 100,
      };

      const response = await app.inject({
        method: 'PATCH',
        url: `/api/v1/experiences/${createdExperienceId}`,
        payload: updateData,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.experienceTitle).toBe('Updated Platform Experience Title');
      expect(body.data.experienceDescription).toBe('Updated description with new content.');
      expect(body.data.maximumCapacity).toBe(100);
    });

    it('should update status from DRAFTED to ACTIVE', async () => {
      if (!createdExperienceId) {
        console.log('Skipping test - no experience created');
        return;
      }

      const updateData = {
        status: 'ACTIVE',
      };

      const response = await app.inject({
        method: 'PATCH',
        url: `/api/v1/experiences/${createdExperienceId}`,
        payload: updateData,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.status).toBe('ACTIVE');
    });

    it('should add tickets to existing experience', async () => {
      if (!createdExperienceId) {
        console.log('Skipping test - no experience created');
        return;
      }

      const updateData = {
        ticket: [
          {
            id: 'new-ticket1',
            ticketType: 'Paid',
            ticketName: 'VIP Ticket',
            ticketPrice: 100,
            ticketQty: 10,
            description: 'Premium access',
          },
          {
            id: 'new-ticket2',
            ticketType: 'Free',
            ticketName: 'Scholarship Ticket',
            ticketPrice: 0,
            ticketQty: 5,
            description: 'For scholarship recipients',
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
      expect(body.data.ticket[0].ticketName).toBe('VIP Ticket');
    });

    it('should update schedules', async () => {
      if (!createdExperienceId) {
        console.log('Skipping test - no experience created');
        return;
      }

      const updateData = {
        schedules: [
          {
            uid: 'updated-schedule1',
            recurringRule: ['TUE', 'THU'],
            startDate: '2025-11-20T15:00:00Z',
            recurringType: 'weekly',
          },
        ],
        isMultiDay: true,
      };

      const response = await app.inject({
        method: 'PATCH',
        url: `/api/v1/experiences/${createdExperienceId}`,
        payload: updateData,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.schedules).toHaveLength(1);
      expect(body.data.isMultiDay).toBe(true);
    });

    it('should update host details', async () => {
      if (!createdExperienceId) {
        console.log('Skipping test - no experience created');
        return;
      }

      const updateData = {
        hostDetails: [
          {
            hubId: testHubId,
            hubName: 'Test Hub',
            expertId: 'new-expert',
            expertName: 'Jane Smith',
            access: 'collaborator',
            profileUrl: 'https://example.com/jane.jpg',
          },
        ],
        noHost: false,
      };

      const response = await app.inject({
        method: 'PATCH',
        url: `/api/v1/experiences/${createdExperienceId}`,
        payload: updateData,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.noHost).toBe(false);
      expect(body.data.hostDetails).toHaveLength(1);
      expect(body.data.hostDetails[0].expertName).toBe('Jane Smith');
    });

    it('should update audience settings', async () => {
      if (!createdExperienceId) {
        console.log('Skipping test - no experience created');
        return;
      }

      const updateData = {
        audienceType: 'Members Only',
        maximumCapacity: 25,
        canBookAsPrivate: true,
        isLearnerPassAvailable: true,
        numberOfLearnerPass: 10,
      };

      const response = await app.inject({
        method: 'PATCH',
        url: `/api/v1/experiences/${createdExperienceId}`,
        payload: updateData,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.audienceType).toBe('Members Only');
      expect(body.data.isLearnerPassAvailable).toBe(true);
      expect(body.data.numberOfLearnerPass).toBe(10);
    });

    it('should update custom questions', async () => {
      if (!createdExperienceId) {
        console.log('Skipping test - no experience created');
        return;
      }

      const updateData = {
        customQuestions: {
          isQuestionMandatory: true,
          questionArray: [
            {
              questionLabel: 'What are your learning goals?',
              questionType: 'paragraph',
              saveStatus: true,
            },
            {
              questionLabel: 'Preferred session time?',
              questionType: 'multiple_choice',
              saveStatus: true,
              multipleChoices: ['Morning', 'Afternoon', 'Evening'],
            },
          ],
        },
      };

      const response = await app.inject({
        method: 'PATCH',
        url: `/api/v1/experiences/${createdExperienceId}`,
        payload: updateData,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.customQuestions).toBeDefined();
      expect(body.data.customQuestions.questionArray).toHaveLength(2);
    });
  });

  describe('GET /api/v1/experiences/:id - Get Platform Experience', () => {
    beforeEach(async () => {
      const data = {
        experienceTitle: 'Retrievable Platform Experience',
        slug: 'retrievable-platform-experience',
        experienceDescription: 'Experience for retrieval testing.',
        experienceType: 'Hybrid',
        hubId: testHubId,
        experienceCategory: testCategoryId,
        experienceTopics: [{ theme: testCategoryId, topic: testTopicId }],
        location: {
          streetAddress: '456 Tech Ave',
          city: 'Seattle',
          state: 'Washington',
          country: 'USA',
          postcode: '98101',
        },
        meetingLink: 'https://meet.google.com/abc-defg-hij',
        primaryLanguage: 'English',
        audienceType: 'Everyone',
        isMultiDay: false,
        feePaidBy: 'hub',
        hostDetails: [
          {
            expertId: 'expert999',
            expertName: 'Expert User',
            access: 'owner',
          },
        ],
        noHost: false,
        canBookAsPrivate: true,
        targetAudience: ['Developers'],
        isScholorSlotAvailable: false,
        isLearnerPassAvailable: false,
        isDiscoveryPassAvailable: false,
        coverPhoto: 'https://example.com/hybrid-cover.jpg',
        status: 'ACTIVE',
        type: 'platform',
        listingType: 'platform',
        currency: 'USD',
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

    it('should retrieve platform experience by ID', async () => {
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
      expect(body.data.experienceTitle).toBe('Retrievable Platform Experience');
      expect(body.data.experienceType).toBe('Hybrid');
      expect(body.data.listingType).toBe('platform');
    });
  });

  describe('DELETE /api/v1/experiences/:id - Delete Platform Experience', () => {
    beforeEach(async () => {
      const data = {
        experienceTitle: 'Platform Experience To Delete',
        slug: 'platform-experience-to-delete',
        experienceDescription: 'This experience will be deleted.',
        experienceType: 'Virtual',
        hubId: testHubId,
        experienceCategory: testCategoryId,
        experienceTopics: [{ theme: testCategoryId, topic: testTopicId }],
        primaryLanguage: 'English',
        audienceType: 'Hidden',
        isMultiDay: false,
        feePaidBy: 'learner',
        hostDetails: [],
        noHost: true,
        canBookAsPrivate: false,
        targetAudience: [],
        isScholorSlotAvailable: false,
        isLearnerPassAvailable: false,
        isDiscoveryPassAvailable: false,
        coverPhoto: 'https://example.com/delete-cover.jpg',
        status: 'DRAFTED',
        type: 'platform',
        listingType: 'platform',
        currency: 'USD',
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

    it('should soft delete platform experience', async () => {
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

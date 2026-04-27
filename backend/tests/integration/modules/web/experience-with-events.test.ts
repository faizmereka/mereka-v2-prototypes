import { Experience } from '@core/models/Experience';
import { ExperienceEvent } from '@core/models/ExperienceEvent';
import type { FastifyInstance } from 'fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { buildApp } from '@/app';

describe('Experience with ExperienceEvent Generation Tests', () => {
  let app: FastifyInstance;
  let createdExperienceId: string;
  const testHubId = '507f1f77bcf86cd799439011';
  const testUserId = '507f1f77bcf86cd799439012';

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();
  });

  afterAll(async () => {
    await Experience.deleteMany({ slug: { $regex: /test-event-gen/ } });
    await ExperienceEvent.deleteMany({});
    await app.close();
  });

  beforeEach(async () => {
    await Experience.deleteMany({ slug: { $regex: /test-event-gen/ } });
    await ExperienceEvent.deleteMany({});
  });

  describe('POST /api/v1/experiences - Create with Event Generation', () => {
    it('should create experience with recurring schedule and generate experienceEvents', async () => {
      const experienceData = {
        experienceTitle: 'Test Weekly Workshop',
        slug: 'test-event-gen-weekly',
        experienceDescription:
          'This is a test weekly recurring workshop for testing event generation',
        experienceType: 'Virtual',
        hubId: testHubId,
        timeZone: 'America/Los_Angeles',
        meetingLink: 'https://zoom.us/j/123456789',
        primaryLanguage: 'English',
        audienceType: 'Everyone',
        maximumCapacity: 20,
        experienceDuration: 3600000, // 1 hour in milliseconds
        feePaidBy: 'learner',
        currency: 'USD',
        coverPhoto: 'https://example.com/cover.jpg',
        ticket: [
          {
            id: 'ticket1',
            ticketType: 'Paid',
            ticketName: 'Standard Ticket',
            ticketPrice: 50,
            ticketQty: 20,
          },
        ],
        schedules: [
          {
            uid: 'schedule1',
            recurringRule: ['DTSTART:20251115T100000', 'RRULE:FREQ=WEEKLY;BYDAY=MO,WE,FR;COUNT=10'],
            startDate: '2025-11-15 10:00AM',
            recurringType: 'weekly',
          },
        ],
        status: 'DRAFTED',
        listingType: 'platform',
        createdBy: testUserId,
      };

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/experiences',
        payload: experienceData,
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.experienceTitle).toBe('Test Weekly Workshop');

      createdExperienceId = body.data._id;

      // Wait a moment for background job to complete
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Verify experienceEvents were created
      const events = await ExperienceEvent.find({ experienceId: createdExperienceId });
      expect(events.length).toBeGreaterThan(0);
      expect(events.length).toBeLessThanOrEqual(10);

      // Verify event structure
      const firstEvent = events[0];
      expect(firstEvent?.experienceId.toString()).toBe(createdExperienceId);
      expect(firstEvent?.scheduleId).toBe('schedule1');
      expect(firstEvent?.isRecurring).toBe(true);
      expect(firstEvent?.status).toBe('ACTIVE');
    });

    it('should create experience with non-repeating schedule and generate single event', async () => {
      const experienceData = {
        experienceTitle: 'Test Single Event',
        slug: 'test-event-gen-single',
        experienceDescription: 'This is a test single event for testing non-repeating schedules',
        experienceType: 'Virtual',
        hubId: testHubId,
        timeZone: 'UTC',
        meetingLink: 'https://meet.google.com/abc-defg',
        primaryLanguage: 'English',
        audienceType: 'Everyone',
        maximumCapacity: 30,
        experienceDuration: 7200000, // 2 hours
        feePaidBy: 'learner',
        currency: 'USD',
        ticket: [
          {
            id: 'ticket1',
            ticketType: 'Free',
            ticketName: 'Free Ticket',
            ticketPrice: 0,
            ticketQty: 30,
          },
        ],
        schedules: [
          {
            uid: 'single-event',
            recurringRule: [],
            startDate: '2025-12-01 02:00PM',
            recurringType: 'no_repeat',
          },
        ],
        status: 'DRAFTED',
        listingType: 'platform',
        createdBy: testUserId,
      };

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/experiences',
        payload: experienceData,
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);

      createdExperienceId = body.data._id;

      // Wait for background job
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Verify single event was created
      const events = await ExperienceEvent.find({ experienceId: createdExperienceId });
      expect(events).toHaveLength(1);
      expect(events[0]?.isRecurring).toBe(false);
      expect(events[0]?.status).toBe('ACTIVE');
    });

    it('should create experience with multiple schedules and generate events for each', async () => {
      const experienceData = {
        experienceTitle: 'Test Multi-Schedule Event',
        slug: 'test-event-gen-multi',
        experienceDescription:
          'This is a test with multiple schedules for testing event generation',
        experienceType: 'Virtual',
        hubId: testHubId,
        timeZone: 'America/New_York',
        meetingLink: 'https://zoom.us/j/987654321',
        primaryLanguage: 'English',
        audienceType: 'Everyone',
        maximumCapacity: 15,
        experienceDuration: 3600000,
        feePaidBy: 'learner',
        currency: 'USD',
        ticket: [
          {
            id: 'ticket1',
            ticketType: 'Paid',
            ticketName: 'Regular',
            ticketPrice: 25,
            ticketQty: 15,
          },
        ],
        schedules: [
          {
            uid: 'morning-schedule',
            recurringRule: ['DTSTART:20251120T090000', 'RRULE:FREQ=WEEKLY;BYDAY=MO;COUNT=5'],
            startDate: '2025-11-20 09:00AM',
            recurringType: 'weekly',
          },
          {
            uid: 'evening-schedule',
            recurringRule: ['DTSTART:20251121T180000', 'RRULE:FREQ=WEEKLY;BYDAY=TU;COUNT=5'],
            startDate: '2025-11-21 06:00PM',
            recurringType: 'weekly',
          },
        ],
        status: 'DRAFTED',
        listingType: 'platform',
        createdBy: testUserId,
      };

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/experiences',
        payload: experienceData,
      });

      expect(response.statusCode).toBe(201);
      createdExperienceId = JSON.parse(response.body).data._id;

      // Wait for background job
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Verify events for both schedules
      const morningEvents = await ExperienceEvent.find({
        experienceId: createdExperienceId,
        scheduleId: 'morning-schedule',
      });
      const eveningEvents = await ExperienceEvent.find({
        experienceId: createdExperienceId,
        scheduleId: 'evening-schedule',
      });

      expect(morningEvents.length).toBeGreaterThan(0);
      expect(eveningEvents.length).toBeGreaterThan(0);
    });
  });

  describe('PATCH /api/v1/experiences/:id - Update with Event Regeneration', () => {
    beforeEach(async () => {
      // Create base experience with schedule
      const baseData = {
        experienceTitle: 'Original Experience',
        slug: 'test-event-gen-update',
        experienceDescription: 'This is the original experience for update testing purposes',
        experienceType: 'Virtual',
        hubId: testHubId,
        timeZone: 'UTC',
        meetingLink: 'https://zoom.us/j/111222333',
        primaryLanguage: 'English',
        audienceType: 'Everyone',
        maximumCapacity: 10,
        experienceDuration: 3600000,
        feePaidBy: 'learner',
        currency: 'USD',
        ticket: [
          {
            id: 'ticket1',
            ticketType: 'Paid',
            ticketName: 'Original Ticket',
            ticketPrice: 30,
            ticketQty: 10,
          },
        ],
        schedules: [
          {
            uid: 'original-schedule',
            recurringRule: ['DTSTART:20251125T100000', 'RRULE:FREQ=WEEKLY;BYDAY=MO;COUNT=3'],
            startDate: '2025-11-25 10:00AM',
            recurringType: 'weekly',
          },
        ],
        status: 'DRAFTED',
        listingType: 'platform',
        createdBy: testUserId,
      };

      const createResponse = await app.inject({
        method: 'POST',
        url: '/api/v1/experiences',
        payload: baseData,
      });

      createdExperienceId = JSON.parse(createResponse.body).data._id;
      await new Promise((resolve) => setTimeout(resolve, 1000));
    });

    it('should regenerate events when schedule is modified', async () => {
      // Get initial event count
      const initialEvents = await ExperienceEvent.find({
        experienceId: createdExperienceId,
        status: 'ACTIVE',
      });
      const initialCount = initialEvents.length;
      expect(initialCount).toBeGreaterThan(0);

      // Update schedule
      const updateData = {
        schedules: [
          {
            uid: 'original-schedule',
            recurringRule: ['DTSTART:20251125T140000', 'RRULE:FREQ=WEEKLY;BYDAY=WE;COUNT=5'],
            startDate: '2025-11-25 02:00PM',
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

      // Wait for background regeneration
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Verify old events are marked deleted
      const deletedEvents = await ExperienceEvent.find({
        experienceId: createdExperienceId,
        scheduleId: 'original-schedule',
        status: 'DELETED',
      });
      expect(deletedEvents.length).toBeGreaterThan(0);

      // Verify new events were created
      const newEvents = await ExperienceEvent.find({
        experienceId: createdExperienceId,
        scheduleId: 'original-schedule',
        status: 'ACTIVE',
      });
      expect(newEvents.length).toBeGreaterThan(0);
    });

    it('should add new schedule and generate events', async () => {
      const updateData = {
        schedules: [
          {
            uid: 'original-schedule',
            recurringRule: ['DTSTART:20251125T100000', 'RRULE:FREQ=WEEKLY;BYDAY=MO;COUNT=3'],
            startDate: '2025-11-25 10:00AM',
            recurringType: 'weekly',
          },
          {
            uid: 'new-schedule',
            recurringRule: ['DTSTART:20251126T150000', 'RRULE:FREQ=WEEKLY;BYDAY=TU;COUNT=4'],
            startDate: '2025-11-26 03:00PM',
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
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Verify events exist for new schedule
      const newScheduleEvents = await ExperienceEvent.find({
        experienceId: createdExperienceId,
        scheduleId: 'new-schedule',
        status: 'ACTIVE',
      });
      expect(newScheduleEvents.length).toBeGreaterThan(0);
    });

    it('should delete events when schedule is removed', async () => {
      // Remove all schedules
      const updateData = {
        schedules: [],
      };

      const response = await app.inject({
        method: 'PATCH',
        url: `/api/v1/experiences/${createdExperienceId}`,
        payload: updateData,
      });

      expect(response.statusCode).toBe(200);
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Verify events are marked deleted
      const deletedEvents = await ExperienceEvent.find({
        experienceId: createdExperienceId,
        status: 'DELETED',
      });
      expect(deletedEvents.length).toBeGreaterThan(0);

      const activeEvents = await ExperienceEvent.find({
        experienceId: createdExperienceId,
        status: 'ACTIVE',
      });
      expect(activeEvents).toHaveLength(0);
    });
  });

  describe('GET /api/v1/experiences/:id - Get Experience by ID', () => {
    it('should retrieve experience by ID', async () => {
      const data = {
        experienceTitle: 'Retrievable Experience',
        slug: 'test-event-gen-retrieve',
        experienceDescription: 'This is a test experience for testing retrieval by ID',
        experienceType: 'Virtual',
        hubId: testHubId,
        timeZone: 'UTC',
        meetingLink: 'https://meet.google.com/test',
        primaryLanguage: 'English',
        audienceType: 'Everyone',
        feePaidBy: 'learner',
        currency: 'USD',
        status: 'DRAFTED',
        listingType: 'platform',
        createdBy: testUserId,
      };

      const createResponse = await app.inject({
        method: 'POST',
        url: '/api/v1/experiences',
        payload: data,
      });

      createdExperienceId = JSON.parse(createResponse.body).data._id;

      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/experiences/${createdExperienceId}`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data._id).toBe(createdExperienceId);
      expect(body.data.experienceTitle).toBe('Retrievable Experience');
    });
  });

  describe('GET /api/v1/experiences/slug/:slug - Get Experience by Slug', () => {
    it('should retrieve experience by slug', async () => {
      const data = {
        experienceTitle: 'Slug Test Experience',
        slug: 'test-event-gen-by-slug',
        experienceDescription: 'This is a test experience for testing retrieval by slug',
        experienceType: 'Virtual',
        hubId: testHubId,
        timeZone: 'UTC',
        meetingLink: 'https://zoom.us/j/slug-test',
        primaryLanguage: 'English',
        audienceType: 'Everyone',
        feePaidBy: 'learner',
        currency: 'USD',
        status: 'DRAFTED',
        listingType: 'platform',
        createdBy: testUserId,
      };

      await app.inject({
        method: 'POST',
        url: '/api/v1/experiences',
        payload: data,
      });

      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/experiences/slug/test-event-gen-by-slug',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.slug).toBe('test-event-gen-by-slug');
      expect(body.data.experienceTitle).toBe('Slug Test Experience');
    });
  });

  describe('GET /api/v1/experiences/check/slug - Check Slug Availability', () => {
    it('should return available for unused slug', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/experiences/check/slug?slug=totally-unused-slug',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.available).toBe(true);
    });

    it('should return unavailable for existing slug', async () => {
      const data = {
        experienceTitle: 'Slug Check Test',
        slug: 'test-event-gen-slug-check',
        experienceDescription: 'This is a test experience for testing slug availability check',
        experienceType: 'Virtual',
        hubId: testHubId,
        timeZone: 'UTC',
        meetingLink: 'https://test.com',
        primaryLanguage: 'English',
        audienceType: 'Everyone',
        feePaidBy: 'learner',
        currency: 'USD',
        status: 'DRAFTED',
        listingType: 'platform',
        createdBy: testUserId,
      };

      await app.inject({
        method: 'POST',
        url: '/api/v1/experiences',
        payload: data,
      });

      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/experiences/check/slug?slug=test-event-gen-slug-check',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.available).toBe(false);
    });
  });
});

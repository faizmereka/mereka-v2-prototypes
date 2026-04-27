import { Hub } from '@core/models/Hub';
import { Slug } from '@core/models/Slug';
import type { FastifyInstance } from 'fastify';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { buildApp } from '@/app';
import { AuthTestHelper, getAuthHeader } from '../../../fixtures/auth.fixture';
import {
  DUPLICATE_SLUG_DATA,
  INVALID_HUB_BAD_SLUG,
  INVALID_HUB_MISSING_FIELDS,
  PARTIAL_HUB_UPDATE,
  VALID_HUB_CREATE_DATA,
  VALID_HUB_UPDATE_SCALE,
  VALID_HUB_UPDATE_SOAR,
} from '../../../fixtures/hub-profile.fixture';

describe('Hub Profile Routes Integration Tests', () => {
  let app: FastifyInstance;
  let authHelper: AuthTestHelper;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();
    authHelper = new AuthTestHelper();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /api/v1/hub-profile', () => {
    it('should create initial hub profile for Soar user', async () => {
      const { token } = await authHelper.createSoarUser();

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/hub-profile',
        headers: getAuthHeader(token),
        payload: VALID_HUB_CREATE_DATA,
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.name).toBe(VALID_HUB_CREATE_DATA.agencyName);
      expect(body.data.slug).toBe(VALID_HUB_CREATE_DATA.slug);
      expect(body.data.hubId).toBeDefined();
      expect(body.data.expertUid).toBeDefined();

      // Verify hub was created in database
      const hub = await Hub.findOne({ slug: VALID_HUB_CREATE_DATA.slug });
      expect(hub).toBeTruthy();
      expect(hub?.name).toBe(VALID_HUB_CREATE_DATA.agencyName);
      expect(hub?.status).toBe('draft');
      expect(hub?.onboardingStep).toBe(1);

      // Verify slug was created
      const slug = await Slug.findOne({ 'slugHistory.slug': VALID_HUB_CREATE_DATA.slug });
      expect(slug).toBeTruthy();
      expect(slug?.slugHistory.find((s) => s.slug === VALID_HUB_CREATE_DATA.slug)?.isActive).toBe(
        true,
      );
    });

    it('should create initial hub profile for Scale user', async () => {
      const { token } = await authHelper.createScaleUser();

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/hub-profile',
        headers: getAuthHeader(token),
        payload: VALID_HUB_CREATE_DATA,
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
    });

    it('should return 401 when not authenticated', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/hub-profile',
        payload: VALID_HUB_CREATE_DATA,
      });

      expect(response.statusCode).toBe(401);
    });

    it('should return 400 for missing required fields', async () => {
      const { token } = await authHelper.createSoarUser();

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/hub-profile',
        headers: getAuthHeader(token),
        payload: INVALID_HUB_MISSING_FIELDS,
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      // Validation errors might have different format (Fastify schema validation)
      expect(body.success === false || body.statusCode === 400).toBe(true);
    });

    it('should return 400 for invalid slug format', async () => {
      const { token } = await authHelper.createSoarUser();

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/hub-profile',
        headers: getAuthHeader(token),
        payload: INVALID_HUB_BAD_SLUG,
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      // Validation errors might have different format (Fastify schema validation)
      expect(body.success === false || body.statusCode === 400).toBe(true);
    });

    it('should return 409 for duplicate slug', async () => {
      const { token: token1 } = await authHelper.createSoarUser();
      const { token: token2 } = await authHelper.createScaleUser();

      // Create first hub
      await app.inject({
        method: 'POST',
        url: '/api/v1/hub-profile',
        headers: getAuthHeader(token1),
        payload: VALID_HUB_CREATE_DATA,
      });

      // Try to create second hub with same slug
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/hub-profile',
        headers: getAuthHeader(token2),
        payload: DUPLICATE_SLUG_DATA,
      });

      expect(response.statusCode).toBe(409);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('SLUG_ALREADY_EXISTS');
    });
  });

  describe('PATCH /api/v1/hub-profile', () => {
    it('should update hub profile for Soar user (hub fields only)', async () => {
      const { token, userId } = await authHelper.createSoarUser();

      // First create hub
      await app.inject({
        method: 'POST',
        url: '/api/v1/hub-profile',
        headers: getAuthHeader(token),
        payload: VALID_HUB_CREATE_DATA,
      });

      // Update hub with complete profile data
      const response = await app.inject({
        method: 'PATCH',
        url: '/api/v1/hub-profile',
        headers: getAuthHeader(token),
        payload: VALID_HUB_UPDATE_SOAR,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.message).toContain('updated successfully');

      // Verify hub was updated
      const hub = await Hub.findOne({ ownerId: userId });
      expect(hub?.description).toBe(VALID_HUB_UPDATE_SOAR.description);
      expect(hub?.tags).toEqual(VALID_HUB_UPDATE_SOAR.tags);
      expect(hub?.onboardingStep).toBe(VALID_HUB_UPDATE_SOAR.onboardingStep);
      expect(hub?.gallery).toEqual(VALID_HUB_UPDATE_SOAR.gallery);
      expect(hub?.operatingHours?.monday?.open).toBe('09:00');
    });

    it('should update hub and user profile for Scale user (both hub and user fields)', async () => {
      const { token, userId } = await authHelper.createScaleUser();
      const { User } = await import('@core/models/User');

      // First create hub
      await app.inject({
        method: 'POST',
        url: '/api/v1/hub-profile',
        headers: getAuthHeader(token),
        payload: VALID_HUB_CREATE_DATA,
      });

      // Update hub with Scale plan data (including user fields)
      const response = await app.inject({
        method: 'PATCH',
        url: '/api/v1/hub-profile',
        headers: getAuthHeader(token),
        payload: VALID_HUB_UPDATE_SCALE,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);

      // Verify hub was updated
      const hub = await Hub.findOne({ ownerId: userId });
      expect(hub?.description).toBe(VALID_HUB_UPDATE_SCALE.description);

      // Verify user was updated with Scale-specific fields
      const user = await User.findById(userId);
      expect(user?.professionalTitle).toBe(VALID_HUB_UPDATE_SCALE.professionalTitle);
      expect(user?.bio).toBe(VALID_HUB_UPDATE_SCALE.bio);
      expect(user?.portfolio).toBeDefined();
      expect(user?.portfolio?.length).toBe(2);
      expect(user?.employment).toBeDefined();
      expect(user?.employment?.length).toBe(2);
      expect(user?.education).toBeDefined();
      expect(user?.education?.length).toBe(1);
      expect(user?.hourlyRate).toBe(VALID_HUB_UPDATE_SCALE.hourlyRate);
    });

    it('should NOT save Scale-specific user fields for Soar user', async () => {
      const { token, userId } = await authHelper.createSoarUser();
      const { User } = await import('@core/models/User');

      // Create hub
      await app.inject({
        method: 'POST',
        url: '/api/v1/hub-profile',
        headers: getAuthHeader(token),
        payload: VALID_HUB_CREATE_DATA,
      });

      // Try to update with Scale-specific fields (should be ignored)
      const response = await app.inject({
        method: 'PATCH',
        url: '/api/v1/hub-profile',
        headers: getAuthHeader(token),
        payload: VALID_HUB_UPDATE_SCALE,
      });

      expect(response.statusCode).toBe(200);

      // Verify Scale-specific user fields were NOT saved (or remain empty/default)
      const user = await User.findById(userId);
      expect(user?.professionalTitle).toBeUndefined();
      // These array fields may be empty arrays (Mongoose default) or undefined
      expect(user?.portfolio?.length || 0).toBe(0);
      expect(user?.employment?.length || 0).toBe(0);
      expect(user?.education?.length || 0).toBe(0);
    });

    it('should support partial updates', async () => {
      const { token, userId } = await authHelper.createSoarUser();

      // Create hub
      await app.inject({
        method: 'POST',
        url: '/api/v1/hub-profile',
        headers: getAuthHeader(token),
        payload: VALID_HUB_CREATE_DATA,
      });

      // Partial update
      const response = await app.inject({
        method: 'PATCH',
        url: '/api/v1/hub-profile',
        headers: getAuthHeader(token),
        payload: PARTIAL_HUB_UPDATE,
      });

      expect(response.statusCode).toBe(200);

      // Verify only specified fields were updated
      const hub = await Hub.findOne({ ownerId: userId });
      expect(hub?.description).toBe(PARTIAL_HUB_UPDATE.description);
      expect(hub?.tags).toEqual(PARTIAL_HUB_UPDATE.tags);
      expect(hub?.onboardingStep).toBe(PARTIAL_HUB_UPDATE.onboardingStep);
      // Original fields should remain
      expect(hub?.name).toBe(VALID_HUB_CREATE_DATA.agencyName);
      expect(hub?.slug).toBe(VALID_HUB_CREATE_DATA.slug);
    });

    it('should create hub if not exists (upsert behavior)', async () => {
      const { token, userId } = await authHelper.createSoarUser();

      // Update without creating first - need to send as two separate calls
      // First create with required fields
      const createResponse = await app.inject({
        method: 'PATCH',
        url: '/api/v1/hub-profile',
        headers: getAuthHeader(token),
        payload: VALID_HUB_CREATE_DATA,
      });

      expect(createResponse.statusCode).toBe(200);

      // Then update with additional fields
      const updateResponse = await app.inject({
        method: 'PATCH',
        url: '/api/v1/hub-profile',
        headers: getAuthHeader(token),
        payload: VALID_HUB_UPDATE_SOAR,
      });

      expect(updateResponse.statusCode).toBe(200);

      // Verify hub was created and updated
      const hub = await Hub.findOne({ ownerId: userId });
      expect(hub).toBeTruthy();
      expect(hub?.name).toBe(VALID_HUB_CREATE_DATA.agencyName);
      expect(hub?.description).toBe(VALID_HUB_UPDATE_SOAR.description);
    });

    it('should update slug and slug history', async () => {
      const { token, userId } = await authHelper.createSoarUser();

      // Create hub
      await app.inject({
        method: 'POST',
        url: '/api/v1/hub-profile',
        headers: getAuthHeader(token),
        payload: VALID_HUB_CREATE_DATA,
      });

      // Update slug
      const newSlug = 'updated-test-hub';
      const response = await app.inject({
        method: 'PATCH',
        url: '/api/v1/hub-profile',
        headers: getAuthHeader(token),
        payload: {
          slug: newSlug,
        },
      });

      expect(response.statusCode).toBe(200);

      // Verify hub slug was updated
      const hub = await Hub.findOne({ ownerId: userId });
      expect(hub?.slug).toBe(newSlug);

      // Verify slug record was updated
      const hubId = String(hub?._id);
      const slug = await Slug.findOne({ resourceId: hubId });
      const activeSlug = slug?.slugHistory.find((s) => s.isActive);
      expect(activeSlug?.slug).toBe(newSlug);
      // Old slug should be in history
      const oldSlug = slug?.slugHistory.find((s) => s.slug === VALID_HUB_CREATE_DATA.slug);
      expect(oldSlug).toBeTruthy();
      expect(oldSlug?.isActive).toBe(false);
    });

    it('should return 401 when not authenticated', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: '/api/v1/hub-profile',
        payload: PARTIAL_HUB_UPDATE,
      });

      expect(response.statusCode).toBe(401);
    });

    it('should return 400 for invalid data', async () => {
      const { token } = await authHelper.createSoarUser();

      const response = await app.inject({
        method: 'PATCH',
        url: '/api/v1/hub-profile',
        headers: getAuthHeader(token),
        payload: {
          slug: 'Invalid Slug With Spaces',
        },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      // Validation errors might have different format (Fastify schema validation)
      expect(body.success === false || body.statusCode === 400).toBe(true);
    });
  });

  describe('GET /api/v1/hub-profile/me', () => {
    it('should get user hub profile', async () => {
      const { token, userId } = await authHelper.createSoarUser();

      // Create hub
      await app.inject({
        method: 'POST',
        url: '/api/v1/hub-profile',
        headers: getAuthHeader(token),
        payload: VALID_HUB_CREATE_DATA,
      });

      // Get hub
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/hub-profile/me',
        headers: getAuthHeader(token),
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.hub).toBeDefined();
      expect(body.data.hub.name).toBe(VALID_HUB_CREATE_DATA.agencyName);
      expect(body.data.hub.ownerId).toBe(userId);
    });

    it('should return 404 when user has no hub', async () => {
      const { token } = await authHelper.createSoarUser();

      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/hub-profile/me',
        headers: getAuthHeader(token),
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('HUB_NOT_FOUND');
    });

    it('should return 401 when not authenticated', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/hub-profile/me',
      });

      expect(response.statusCode).toBe(401);
    });
  });

  describe('POST /api/v1/hub-profile/publish', () => {
    it('should publish hub when all required fields are filled (Soar plan)', async () => {
      const { token } = await authHelper.createSoarUser();

      // Create and complete hub profile
      await app.inject({
        method: 'POST',
        url: '/api/v1/hub-profile',
        headers: getAuthHeader(token),
        payload: VALID_HUB_CREATE_DATA,
      });

      await app.inject({
        method: 'PATCH',
        url: '/api/v1/hub-profile',
        headers: getAuthHeader(token),
        payload: VALID_HUB_UPDATE_SOAR,
      });

      // Publish hub
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/hub-profile/publish',
        headers: getAuthHeader(token),
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.status).toBe('pending_review');
    });

    it('should publish hub when all required fields are filled (Scale plan)', async () => {
      const { token } = await authHelper.createScaleUser();

      // Create and complete hub profile with Scale data
      await app.inject({
        method: 'POST',
        url: '/api/v1/hub-profile',
        headers: getAuthHeader(token),
        payload: VALID_HUB_CREATE_DATA,
      });

      await app.inject({
        method: 'PATCH',
        url: '/api/v1/hub-profile',
        headers: getAuthHeader(token),
        payload: VALID_HUB_UPDATE_SCALE,
      });

      // Publish hub
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/hub-profile/publish',
        headers: getAuthHeader(token),
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.status).toBe('pending_review');
    });

    it('should return 400 when required fields are missing (Soar plan)', async () => {
      const { token } = await authHelper.createSoarUser();

      // Create hub but don't fill all required fields
      await app.inject({
        method: 'POST',
        url: '/api/v1/hub-profile',
        headers: getAuthHeader(token),
        payload: VALID_HUB_CREATE_DATA,
      });

      // Try to publish without completing profile
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/hub-profile/publish',
        headers: getAuthHeader(token),
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('VALIDATION_FAILED');
      expect(body.error.details.missingFields).toBeDefined();
      expect(body.error.details.missingFields).toContain('hub.description');
      expect(body.error.details.missingFields).toContain('hub.focusAreas');
    });

    it('should return 400 when Scale-specific required fields are missing', async () => {
      const { token } = await authHelper.createScaleUser();

      // Create hub with only Soar fields
      await app.inject({
        method: 'POST',
        url: '/api/v1/hub-profile',
        headers: getAuthHeader(token),
        payload: VALID_HUB_CREATE_DATA,
      });

      await app.inject({
        method: 'PATCH',
        url: '/api/v1/hub-profile',
        headers: getAuthHeader(token),
        payload: VALID_HUB_UPDATE_SOAR,
      });

      // Try to publish without Scale-specific fields
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/hub-profile/publish',
        headers: getAuthHeader(token),
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      expect(body.error.details.missingFields).toBeDefined();
      expect(body.error.details.missingFields).toContain('user.professionalTitle');
      expect(body.error.details.missingFields).toContain('user.jobPreferences');
    });

    it('should return 401 when not authenticated', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/hub-profile/publish',
      });

      expect(response.statusCode).toBe(401);
    });
  });
});

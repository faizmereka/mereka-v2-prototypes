import { User } from '@core/models/User';
import type { FastifyInstance } from 'fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { buildApp } from '@/app';
import { AuthTestHelper, getAuthHeader } from '../../../fixtures/auth.fixture';

describe('Stripe Payment Routes Integration Tests', () => {
  let app: FastifyInstance;
  let authHelper: AuthTestHelper;
  let authToken: string;
  let testUserId: string;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();
    authHelper = new AuthTestHelper();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    // Clean up users before each test
    await User.deleteMany({});

    // Create fresh authenticated test user for each test
    const { token, userId } = await authHelper.createSoarUser();
    authToken = token;
    testUserId = userId;
  });

  describe('POST /api/v1/users/:userId/payment-methods', () => {
    it('should attach payment method and create Stripe customer', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/api/v1/users/${testUserId}/payment-methods`,
        headers: getAuthHeader(authToken),
        payload: {
          paymentMethodId: 'pm_card_visa',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data).toBeDefined();
    });

    it('should return 404 for non-existent user', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/users/507f1f77bcf86cd799439099/payment-methods',
        headers: getAuthHeader(authToken),
        payload: {
          paymentMethodId: 'pm_card_visa',
        },
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('USER_NOT_FOUND');
    });

    it('should return 400 for missing paymentMethodId', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/api/v1/users/${testUserId}/payment-methods`,
        headers: getAuthHeader(authToken),
        payload: {},
      });

      expect(response.statusCode).toBe(400);
    });

    it('should handle invalid paymentMethodId gracefully', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/api/v1/users/${testUserId}/payment-methods`,
        headers: getAuthHeader(authToken),
        payload: {
          paymentMethodId: 'invalid_pm_id',
        },
      });

      // Should return 500 with error from Stripe
      expect(response.statusCode).toBe(500);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('ATTACH_PAYMENT_METHOD_FAILED');
    });
  });

  describe('GET /api/v1/users/:userId/payment-methods', () => {
    it('should return empty array for user without Stripe customer', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/users/${testUserId}/payment-methods`,
        headers: getAuthHeader(authToken),
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data).toEqual([]);
    });

    it('should return 404 for non-existent user', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/users/507f1f77bcf86cd799439099/payment-methods',
        headers: getAuthHeader(authToken),
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('USER_NOT_FOUND');
    });
  });

  describe('DELETE /api/v1/users/:userId/payment-methods/:paymentMethodId', () => {
    it('should return 404 for non-existent user', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: '/api/v1/users/507f1f77bcf86cd799439099/payment-methods/pm_123',
        headers: getAuthHeader(authToken),
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('USER_NOT_FOUND');
    });

    it('should handle invalid paymentMethodId gracefully', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: `/api/v1/users/${testUserId}/payment-methods/invalid_pm`,
        headers: getAuthHeader(authToken),
      });

      // Returns 404 when payment method doesn't exist in Stripe
      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
    });
  });

  describe('PATCH /api/v1/users/:userId/payment-methods/default', () => {
    it('should return 400 for user without Stripe customer', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: `/api/v1/users/${testUserId}/payment-methods/default`,
        headers: getAuthHeader(authToken),
        payload: {
          paymentMethodId: 'pm_card_visa',
        },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('NO_STRIPE_CUSTOMER');
    });

    it('should return 404 for non-existent user', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: '/api/v1/users/507f1f77bcf86cd799439099/payment-methods/default',
        headers: getAuthHeader(authToken),
        payload: {
          paymentMethodId: 'pm_card_visa',
        },
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('USER_NOT_FOUND');
    });

    it('should return 400 for missing paymentMethodId', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: `/api/v1/users/${testUserId}/payment-methods/default`,
        headers: getAuthHeader(authToken),
        payload: {},
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe('POST /api/v1/users/:userId/payment-intents/escrow', () => {
    it('should create escrow payment intent and Stripe customer', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/api/v1/users/${testUserId}/payment-intents/escrow`,
        headers: getAuthHeader(authToken),
        payload: {
          amount: 500000,
          currency: 'USD',
          paymentMethodId: 'pm_card_visa',
          description: 'First milestone payment',
          metadata: {
            contractId: 'contract_123',
            milestoneId: 'milestone_456',
            jobId: 'job_789',
          },
        },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data).toBeDefined();
      expect(body.data.id).toBeDefined();
      expect(body.data.amount).toBe(500000);
      expect(body.data.currency).toBe('usd');
      expect(body.data.capture_method).toBe('manual');
    });

    it('should return 404 for non-existent user', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/users/507f1f77bcf86cd799439099/payment-intents/escrow',
        headers: getAuthHeader(authToken),
        payload: {
          amount: 500000,
          currency: 'USD',
          paymentMethodId: 'pm_card_visa',
          description: 'Test',
          metadata: {
            contractId: 'contract_123',
          },
        },
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('USER_NOT_FOUND');
    });

    it('should return 400 for invalid amount', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/api/v1/users/${testUserId}/payment-intents/escrow`,
        headers: getAuthHeader(authToken),
        payload: {
          amount: -100,
          currency: 'USD',
          paymentMethodId: 'pm_card_visa',
          description: 'Test',
          metadata: {
            contractId: 'contract_123',
          },
        },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should return 400 for missing required fields', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/api/v1/users/${testUserId}/payment-intents/escrow`,
        headers: getAuthHeader(authToken),
        payload: {
          amount: 500000,
          // Missing currency, paymentMethodId, description, metadata
        },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should return 400 for invalid currency code', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/api/v1/users/${testUserId}/payment-intents/escrow`,
        headers: getAuthHeader(authToken),
        payload: {
          amount: 500000,
          currency: 'INVALID',
          paymentMethodId: 'pm_card_visa',
          description: 'Test',
          metadata: {
            contractId: 'contract_123',
          },
        },
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe('POST /api/v1/payment-intents/:paymentIntentId/capture', () => {
    it('should handle invalid paymentIntentId gracefully', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/payment-intents/invalid_pi_123/capture',
        headers: getAuthHeader(authToken),
      });

      // Should return 500 with error from Stripe
      expect(response.statusCode).toBe(500);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('CAPTURE_PAYMENT_INTENT_FAILED');
    });

    it('should accept optional amount parameter', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/payment-intents/invalid_pi_123/capture',
        headers: getAuthHeader(authToken),
        payload: {
          amount: 250000,
        },
      });

      // Should still fail due to invalid ID, but payload should be accepted
      expect(response.statusCode).toBe(500);
    });
  });

  describe('POST /api/v1/payment-intents/:paymentIntentId/cancel', () => {
    it('should handle invalid paymentIntentId gracefully', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/payment-intents/invalid_pi_123/cancel',
        headers: getAuthHeader(authToken),
      });

      // Should return 500 with error from Stripe
      expect(response.statusCode).toBe(500);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('CANCEL_PAYMENT_INTENT_FAILED');
    });

    it('should accept optional cancellationReason parameter', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/payment-intents/invalid_pi_123/cancel',
        headers: getAuthHeader(authToken),
        payload: {
          cancellationReason: 'requested_by_customer',
        },
      });

      // Should still fail due to invalid ID, but payload should be accepted
      expect(response.statusCode).toBe(500);
    });

    it('should reject invalid cancellationReason', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/payment-intents/pi_123/cancel',
        headers: getAuthHeader(authToken),
        payload: {
          cancellationReason: 'invalid_reason',
        },
      });

      expect(response.statusCode).toBe(400);
    });
  });
});

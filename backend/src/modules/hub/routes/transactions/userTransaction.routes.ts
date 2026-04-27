import {
  addUserBankAccount,
  createUserStripeAccount,
  createUserWithdrawal,
  deleteUserBankAccount,
  exportUserEarnings,
  getUserBalance,
  getUserBankAccounts,
  getUserDashboardLink,
  getUserEarnings,
  getUserOnboardingLink,
  getUserStripeStatus,
  getUserSupportedBanks,
  getUserWithdrawals,
  setUserDefaultBankAccount,
} from '@controllers/hub';
import { requireAuth } from '@core/middlewares/auth.middleware';
import {
  userCreateOnboardingLinkSchema,
  userCreateStripeAccountSchema,
  userCreateWithdrawalSchema,
  userExportEarningsSchema,
  userGetBalanceSchema,
  userGetBankAccountsSchema,
  userGetDashboardLinkSchema,
  userGetEarningsSchema,
  userGetStripeStatusSchema,
  userGetWithdrawalsSchema,
} from '@core/schemas/hub/transactions';
import type { FastifyInstance } from 'fastify';

/**
 * User Transaction Routes (for expert earnings)
 * Prefix: /api/v1/users/me/transactions
 */
export async function userTransactionRoutes(fastify: FastifyInstance): Promise<void> {
  // All routes require authentication
  fastify.addHook('preHandler', requireAuth);

  // ==========================================================================
  // STRIPE ACCOUNT ROUTES
  // ==========================================================================

  // Get user's Stripe account status
  fastify.get('/stripe/status', {
    schema: userGetStripeStatusSchema,
    handler: getUserStripeStatus,
  });

  // Create Stripe Connect account for user
  fastify.post('/stripe/account', {
    schema: userCreateStripeAccountSchema,
    handler: createUserStripeAccount,
  });

  // Create onboarding link for KYC
  fastify.post('/stripe/onboarding-link', {
    schema: userCreateOnboardingLinkSchema,
    handler: getUserOnboardingLink,
  });

  // Create Stripe dashboard link
  fastify.get('/stripe/dashboard-link', {
    schema: userGetDashboardLinkSchema,
    handler: getUserDashboardLink,
  });

  // ==========================================================================
  // BALANCE & EARNINGS ROUTES
  // ==========================================================================

  // Get user balance
  fastify.get('/balance', {
    schema: userGetBalanceSchema,
    handler: getUserBalance,
  });

  // List user earnings
  fastify.get('/', {
    schema: userGetEarningsSchema,
    handler: getUserEarnings,
  });

  // Export earnings as CSV
  fastify.get('/export', {
    schema: userExportEarningsSchema,
    handler: exportUserEarnings,
  });

  // ==========================================================================
  // WITHDRAWAL ROUTES
  // ==========================================================================

  // List user withdrawals
  fastify.get('/withdrawals', {
    schema: userGetWithdrawalsSchema,
    handler: getUserWithdrawals,
  });

  // Create withdrawal
  fastify.post('/withdrawals', {
    schema: userCreateWithdrawalSchema,
    handler: createUserWithdrawal,
  });

  // ==========================================================================
  // BANK ACCOUNT ROUTES
  // ==========================================================================

  // Get supported banks
  fastify.get('/bank-accounts/supported-banks', {
    schema: {
      tags: ['User Transactions'],
      summary: 'Get supported banks',
      querystring: {
        type: 'object',
        properties: {
          country: { type: 'string', default: 'MY' },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                banks: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      id: { type: 'string' },
                      name: { type: 'string' },
                      code: { type: 'string' },
                      logoUrl: { type: 'string' },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    handler: getUserSupportedBanks,
  });

  // List bank accounts (from Stripe)
  fastify.get('/bank-accounts', {
    schema: userGetBankAccountsSchema,
    handler: getUserBankAccounts,
  });

  // Add bank account
  fastify.post('/bank-accounts', {
    schema: {
      tags: ['User Transactions'],
      summary: 'Add bank account',
      body: {
        type: 'object',
        required: ['accountNumber', 'routingNumber', 'accountHolderName', 'accountHolderType'],
        properties: {
          accountNumber: { type: 'string' },
          routingNumber: { type: 'string' },
          accountHolderName: { type: 'string' },
          accountHolderType: { type: 'string', enum: ['individual', 'company'] },
          currency: { type: 'string', default: 'MYR' },
          country: { type: 'string', default: 'MY' },
          setAsDefault: { type: 'boolean', default: false },
        },
      },
      response: {
        201: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: { type: 'object' },
          },
        },
      },
    },
    handler: addUserBankAccount,
  });

  // Set default bank account
  fastify.post('/bank-accounts/:bankAccountId/default', {
    schema: {
      tags: ['User Transactions'],
      summary: 'Set default bank account',
      params: {
        type: 'object',
        required: ['bankAccountId'],
        properties: {
          bankAccountId: { type: 'string' },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: { type: 'object' },
          },
        },
      },
    },
    handler: setUserDefaultBankAccount,
  });

  // Delete bank account
  fastify.delete('/bank-accounts/:bankAccountId', {
    schema: {
      tags: ['User Transactions'],
      summary: 'Delete bank account',
      params: {
        type: 'object',
        required: ['bankAccountId'],
        properties: {
          bankAccountId: { type: 'string' },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
          },
        },
      },
    },
    handler: deleteUserBankAccount,
  });
}

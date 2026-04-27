/**
 * User Transaction Schemas
 * JSON Schema definitions for user transaction endpoints (expert earnings)
 */

// =============================================================================
// INPUT TYPES
// =============================================================================

export interface UserCreateOnboardingLinkBody {
  returnUrl: string;
  refreshUrl: string;
}

export interface UserGetEarningsQuery {
  type?: string;
  status?: string;
  page?: number;
  limit?: number;
}

export interface UserExportEarningsQuery {
  type?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
}

export interface UserGetWithdrawalsQuery {
  status?: string;
  limit?: number;
  startingAfter?: string;
}

export interface UserCreateWithdrawalBody {
  amount: number;
  currency?: string;
  bankAccountId?: string;
  description?: string;
}

// =============================================================================
// STRIPE ACCOUNT SCHEMAS
// =============================================================================

/**
 * Get user's Stripe account status
 * GET /api/v1/users/me/transactions/stripe/status
 */
export const userGetStripeStatusSchema = {
  tags: ['User Transactions'],
  summary: 'Get Stripe Connect account status',
  description:
    'Get the current status of the user Stripe Connect account including KYC requirements',
  response: {
    200: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: {
          type: 'object',
          properties: {
            hasAccount: { type: 'boolean' },
            stripeAccountId: { type: 'string' },
            chargesEnabled: { type: 'boolean' },
            payoutsEnabled: { type: 'boolean' },
            detailsSubmitted: { type: 'boolean' },
            connectCompleted: { type: 'boolean' },
            showMyEarnings: {
              type: 'boolean',
              description:
                'Whether to show My Earnings section. False if user owns a hub with same stripeAccountId.',
            },
            requirements: {
              type: 'object',
              properties: {
                currentlyDue: { type: 'array', items: { type: 'string' } },
                eventuallyDue: { type: 'array', items: { type: 'string' } },
                pastDue: { type: 'array', items: { type: 'string' } },
                disabledReason: { type: 'string' },
                errors: {
                  type: 'array',
                  description: 'Verification errors with human-readable reasons',
                  items: {
                    type: 'object',
                    properties: {
                      code: { type: 'string', description: 'Error code' },
                      reason: { type: 'string', description: 'Human-readable error reason' },
                      requirement: { type: 'string', description: 'The requirement that failed' },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  },
} as const;

/**
 * Create Stripe Connect account for user
 * POST /api/v1/users/me/transactions/stripe/account
 */
export const userCreateStripeAccountSchema = {
  tags: ['User Transactions'],
  summary: 'Create Stripe Connect account',
  description: 'Create a new Stripe Connect account for the user (expert payouts)',
  response: {
    201: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: {
          type: 'object',
          properties: {
            stripeAccountId: { type: 'string' },
          },
        },
      },
    },
  },
} as const;

/**
 * Create onboarding link
 * POST /api/v1/users/me/transactions/stripe/onboarding-link
 */
export const userCreateOnboardingLinkSchema = {
  tags: ['User Transactions'],
  summary: 'Create Stripe onboarding link',
  description: 'Generate a Stripe Connect onboarding link for KYC verification',
  body: {
    type: 'object',
    required: ['returnUrl', 'refreshUrl'],
    properties: {
      returnUrl: {
        type: 'string',
        format: 'uri',
        description: 'URL to redirect after successful onboarding',
      },
      refreshUrl: {
        type: 'string',
        format: 'uri',
        description: 'URL to redirect if link expires',
      },
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
            url: { type: 'string', format: 'uri' },
          },
        },
      },
    },
  },
} as const;

/**
 * Create dashboard link
 * GET /api/v1/users/me/transactions/stripe/dashboard-link
 */
export const userGetDashboardLinkSchema = {
  tags: ['User Transactions'],
  summary: 'Create Stripe dashboard link',
  description: 'Generate a link to the Stripe Express dashboard',
  response: {
    200: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: {
          type: 'object',
          properties: {
            url: { type: 'string', format: 'uri' },
          },
        },
      },
    },
  },
} as const;

// =============================================================================
// BALANCE & EARNINGS SCHEMAS
// =============================================================================

/**
 * Get user balance
 * GET /api/v1/users/me/transactions/balance
 */
export const userGetBalanceSchema = {
  tags: ['User Transactions'],
  summary: 'Get user balance',
  description: 'Get the current available and pending balance for the user',
  response: {
    200: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: {
          type: 'object',
          properties: {
            available: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  amount: { type: 'number' },
                  currency: { type: 'string' },
                },
              },
            },
            pending: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  amount: { type: 'number' },
                  currency: { type: 'string' },
                },
              },
            },
            totalAvailable: { type: 'number' },
            totalPending: { type: 'number' },
            currency: { type: 'string' },
          },
        },
      },
    },
  },
} as const;

/**
 * List user earnings
 * GET /api/v1/users/me/transactions
 */
export const userGetEarningsSchema = {
  tags: ['User Transactions'],
  summary: 'List user earnings',
  description: 'Get earnings history for the user from jobs and milestones',
  querystring: {
    type: 'object',
    properties: {
      type: {
        type: 'string',
        description: 'Filter by earning type',
      },
      status: {
        type: 'string',
        description: 'Filter by status',
      },
      page: {
        type: 'number',
        minimum: 1,
        default: 1,
        description: 'Page number',
      },
      limit: {
        type: 'number',
        minimum: 1,
        maximum: 100,
        default: 50,
        description: 'Number of earnings to return',
      },
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
            earnings: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  _id: { type: 'string' },
                  type: { type: 'string' },
                  status: { type: 'string' },
                  referenceId: { type: 'string' },
                  amount: { type: 'number' },
                  currency: { type: 'string' },
                  platformFee: { type: 'number' },
                  transferAmount: { type: 'number' },
                  hubId: { type: 'string' },
                  description: { type: 'string' },
                  createdAt: { type: 'string', format: 'date-time' },
                  metadata: {
                    type: 'object',
                    properties: {
                      hubId: { type: 'string' },
                      hubName: { type: 'string' },
                      contractId: { type: 'string' },
                      milestoneId: { type: 'string' },
                    },
                  },
                },
              },
            },
            pagination: {
              type: 'object',
              properties: {
                page: { type: 'number' },
                limit: { type: 'number' },
                total: { type: 'number' },
                totalPages: { type: 'number' },
              },
            },
            summary: {
              type: 'object',
              properties: {
                totalEarnings: { type: 'number' },
                totalWithdrawals: { type: 'number' },
                pendingAmount: { type: 'number' },
                netEarnings: { type: 'number' },
              },
            },
          },
        },
      },
    },
  },
} as const;

/**
 * Export earnings as CSV
 * GET /api/v1/users/me/transactions/export
 */
export const userExportEarningsSchema = {
  tags: ['User Transactions'],
  summary: 'Export earnings to CSV',
  description: 'Export earnings history as a CSV file',
  querystring: {
    type: 'object',
    properties: {
      type: {
        type: 'string',
        description: 'Filter by earning type',
      },
      status: {
        type: 'string',
        description: 'Filter by status',
      },
      startDate: {
        type: 'string',
        format: 'date',
        description: 'Filter from date (YYYY-MM-DD)',
      },
      endDate: {
        type: 'string',
        format: 'date',
        description: 'Filter to date (YYYY-MM-DD)',
      },
    },
  },
} as const;

// =============================================================================
// WITHDRAWAL SCHEMAS
// =============================================================================

/**
 * List user withdrawals
 * GET /api/v1/users/me/transactions/withdrawals
 */
export const userGetWithdrawalsSchema = {
  tags: ['User Transactions'],
  summary: 'List withdrawals',
  description: 'Get list of withdrawal/payout history',
  querystring: {
    type: 'object',
    properties: {
      status: {
        type: 'string',
        description: 'Filter by withdrawal status',
      },
      limit: {
        type: 'number',
        minimum: 1,
        maximum: 100,
        default: 25,
        description: 'Number of withdrawals to return',
      },
      startingAfter: {
        type: 'string',
        description: 'Cursor for pagination',
      },
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
            withdrawals: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  amount: { type: 'number' },
                  currency: { type: 'string' },
                  status: { type: 'string' },
                  arrivalDate: { type: 'string', format: 'date-time' },
                  bankAccountLast4: { type: 'string' },
                  bankName: { type: 'string' },
                  description: { type: 'string' },
                  createdAt: { type: 'string', format: 'date-time' },
                },
              },
            },
            pagination: {
              type: 'object',
              properties: {
                hasMore: { type: 'boolean' },
                startingAfter: { type: 'string' },
              },
            },
            summary: {
              type: 'object',
              properties: {
                totalWithdrawn: { type: 'number' },
                pendingWithdrawals: { type: 'number' },
                lastWithdrawalDate: { type: 'string', format: 'date-time' },
              },
            },
          },
        },
      },
    },
  },
} as const;

/**
 * Create withdrawal
 * POST /api/v1/users/me/transactions/withdrawals
 */
export const userCreateWithdrawalSchema = {
  tags: ['User Transactions'],
  summary: 'Create withdrawal',
  description: 'Create a new withdrawal (payout) to bank account',
  body: {
    type: 'object',
    required: ['amount'],
    properties: {
      amount: {
        type: 'number',
        minimum: 100,
        description: 'Amount to withdraw in cents',
      },
      currency: {
        type: 'string',
        default: 'MYR',
        description: 'Currency code',
      },
      bankAccountId: {
        type: 'string',
        description: 'Specific bank account ID, or use default',
      },
      description: {
        type: 'string',
        maxLength: 200,
        description: 'Description for the withdrawal',
      },
    },
  },
  response: {
    201: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            amount: { type: 'number' },
            currency: { type: 'string' },
            status: { type: 'string' },
            arrivalDate: { type: 'string', format: 'date-time' },
            bankAccountLast4: { type: 'string' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
      },
    },
  },
} as const;

// =============================================================================
// BANK ACCOUNT SCHEMAS
// =============================================================================

/**
 * List bank accounts
 * GET /api/v1/users/me/transactions/bank-accounts
 */
export const userGetBankAccountsSchema = {
  tags: ['User Transactions'],
  summary: 'List bank accounts',
  description: 'Get list of connected bank accounts for withdrawals',
  response: {
    200: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: {
          type: 'object',
          properties: {
            bankAccounts: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  bankName: { type: 'string' },
                  last4: { type: 'string' },
                  accountHolderName: { type: 'string' },
                  accountHolderType: { type: 'string' },
                  currency: { type: 'string' },
                  country: { type: 'string' },
                  isDefault: { type: 'boolean' },
                  status: { type: 'string' },
                },
              },
            },
            defaultBankAccountId: { type: 'string' },
          },
        },
      },
    },
  },
} as const;

/**
 * Hub Transaction Schemas
 * JSON Schema definitions for hub transaction endpoints
 */

// =============================================================================
// INPUT TYPES
// =============================================================================

export interface HubGetBalanceParams {
  hubId: string;
}

export interface HubListTransactionsQuery {
  type?:
    | 'booking_payment'
    | 'milestone_fund'
    | 'milestone_release'
    | 'timelog_payment'
    | 'expert_transfer'
    | 'withdrawal'
    | 'refund'
    | 'all';
  status?: 'pending' | 'processing' | 'succeeded' | 'failed' | 'refunded' | 'cancelled' | 'all';
  direction?: 'inbound' | 'outbound' | 'internal';
  startDate?: string;
  endDate?: string;
  limit?: number;
  page?: number;
}

export interface HubGetTransactionParams {
  hubId: string;
  transactionId: string;
}

export interface HubExportTransactionsQuery {
  type?: 'experience_booking' | 'expertise_booking' | 'withdrawal' | 'refund' | 'all';
  status?: 'pending' | 'completed' | 'failed' | 'all';
  startDate?: string;
  endDate?: string;
}

export interface HubCreateWithdrawalBody {
  amount: number;
  currency?: string;
  bankAccountId?: string;
  description?: string;
}

export interface HubListWithdrawalsQuery {
  status?: 'pending' | 'in_transit' | 'paid' | 'failed' | 'cancelled' | 'all';
  limit?: number;
  startingAfter?: string;
}

export interface HubCancelWithdrawalParams {
  hubId: string;
  withdrawalId: string;
}

export interface HubAddBankAccountBody {
  accountNumber: string;
  routingNumber: string;
  accountHolderName: string;
  accountHolderType: 'individual' | 'company';
  currency?: string;
  country?: string;
  setAsDefault?: boolean;
}

export interface HubUpdateBankAccountBody {
  accountHolderName?: string;
  accountHolderType?: 'individual' | 'company';
}

export interface HubDeleteBankAccountParams {
  hubId: string;
  bankAccountId: string;
}

export interface HubSetDefaultBankAccountParams {
  hubId: string;
  bankAccountId: string;
}

export interface HubCreateOnboardingLinkBody {
  returnUrl: string;
  refreshUrl: string;
}

// =============================================================================
// COMMON SCHEMA PARTS
// =============================================================================

const hubIdParam = {
  type: 'object',
  required: ['hubId'],
  properties: {
    hubId: {
      type: 'string',
      minLength: 24,
      maxLength: 24,
      description: 'Hub ID',
    },
  },
} as const;

// =============================================================================
// STRIPE ACCOUNT SCHEMAS
// =============================================================================

/**
 * Get Stripe account status
 * GET /api/v1/hub/:hubId/transactions/stripe/status
 */
export const hubGetStripeStatusSchema = {
  tags: ['Hub Transactions'],
  summary: 'Get Stripe Connect account status',
  description:
    'Get the current status of the hub Stripe Connect account including KYC requirements',
  params: hubIdParam,
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
              description: 'Whether to show My Earnings tab for the current user',
            },
            hubCurrency: {
              type: 'string',
              description: 'Hub currency based on country (e.g., MYR, IDR)',
            },
            stripeAccountCurrency: {
              type: 'string',
              description: 'Stripe Connect account default currency',
            },
            currencyMismatch: {
              type: 'boolean',
              description: 'True if hub currency does not match Stripe account currency',
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
 * Create Stripe Connect account
 * POST /api/v1/hub/:hubId/transactions/stripe/account
 */
export const hubCreateStripeAccountSchema = {
  tags: ['Hub Transactions'],
  summary: 'Create Stripe Connect account',
  description: 'Create a new Stripe Connect account for the hub',
  params: hubIdParam,
  response: {
    201: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            stripeAccountId: { type: 'string' },
            accountType: { type: 'string' },
            chargesEnabled: { type: 'boolean' },
            payoutsEnabled: { type: 'boolean' },
          },
        },
      },
    },
  },
} as const;

/**
 * Create onboarding link
 * POST /api/v1/hub/:hubId/transactions/stripe/onboarding-link
 */
export const hubCreateOnboardingLinkSchema = {
  tags: ['Hub Transactions'],
  summary: 'Create Stripe onboarding link',
  description: 'Generate a Stripe Connect onboarding link for KYC verification',
  params: hubIdParam,
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
 * GET /api/v1/hub/:hubId/transactions/stripe/dashboard-link
 */
export const hubCreateDashboardLinkSchema = {
  tags: ['Hub Transactions'],
  summary: 'Create Stripe dashboard link',
  description: 'Generate a link to the Stripe Express dashboard',
  params: hubIdParam,
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
// BALANCE & TRANSACTIONS SCHEMAS
// =============================================================================

/**
 * Get hub balance
 * GET /api/v1/hub/:hubId/transactions/balance
 */
export const hubGetBalanceSchema = {
  tags: ['Hub Transactions'],
  summary: 'Get hub balance',
  description: 'Get the current available and pending balance for the hub',
  params: hubIdParam,
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
 * List transactions
 * GET /api/v1/hub/:hubId/transactions
 */
export const hubListTransactionsSchema = {
  tags: ['Hub Transactions'],
  summary: 'List hub transactions',
  description: 'Get transaction history for the hub with filtering options',
  params: hubIdParam,
  querystring: {
    type: 'object',
    properties: {
      type: {
        type: 'string',
        enum: [
          'booking_payment',
          'milestone_fund',
          'milestone_release',
          'timelog_payment',
          'expert_transfer',
          'withdrawal',
          'refund',
          'all',
        ],
        default: 'all',
        description: 'Filter by transaction type',
      },
      status: {
        type: 'string',
        enum: ['pending', 'processing', 'succeeded', 'failed', 'refunded', 'cancelled', 'all'],
        default: 'all',
        description: 'Filter by transaction status',
      },
      direction: {
        type: 'string',
        enum: ['inbound', 'outbound', 'internal'],
        description: 'Filter by transaction direction',
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
      limit: {
        type: 'number',
        minimum: 1,
        maximum: 100,
        default: 25,
        description: 'Number of transactions to return',
      },
      page: {
        type: 'number',
        minimum: 1,
        default: 1,
        description: 'Page number for pagination',
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
            transactions: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  referenceId: { type: 'string' },
                  type: { type: 'string' },
                  status: { type: 'string' },
                  amount: { type: 'number' },
                  currency: { type: 'string' },
                  fee: { type: 'number' },
                  net: { type: 'number' },
                  description: { type: 'string' },
                  metadata: {
                    type: 'object',
                    properties: {
                      bookingId: { type: 'string' },
                      serviceId: { type: 'string' },
                      contractId: { type: 'string' },
                      milestoneId: { type: 'string' },
                      fromUserId: { type: 'string' },
                      toUserId: { type: 'string' },
                      stripePaymentIntentId: { type: 'string' },
                      stripePayoutId: { type: 'string' },
                    },
                  },
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
                totalEarnings: { type: 'number' },
                totalTransfers: { type: 'number' },
                totalWithdrawals: { type: 'number' },
                totalRefunds: { type: 'number' },
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
 * Get single transaction
 * GET /api/v1/hub/:hubId/transactions/:transactionId
 */
export const hubGetTransactionSchema = {
  tags: ['Hub Transactions'],
  summary: 'Get transaction details',
  description: 'Get details of a single transaction',
  params: {
    type: 'object',
    required: ['hubId', 'transactionId'],
    properties: {
      hubId: {
        type: 'string',
        minLength: 24,
        maxLength: 24,
        description: 'Hub ID',
      },
      transactionId: {
        type: 'string',
        description: 'Transaction ID',
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
            id: { type: 'string' },
            type: { type: 'string' },
            status: { type: 'string' },
            amount: { type: 'number' },
            currency: { type: 'string' },
            fee: { type: 'number' },
            net: { type: 'number' },
            description: { type: 'string' },
            metadata: { type: 'object' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
      },
    },
  },
} as const;

/**
 * Export transactions
 * GET /api/v1/hub/:hubId/transactions/export
 */
export const hubExportTransactionsSchema = {
  tags: ['Hub Transactions'],
  summary: 'Export transactions to CSV',
  description: 'Export transaction history as a CSV file',
  params: hubIdParam,
  querystring: {
    type: 'object',
    properties: {
      type: {
        type: 'string',
        enum: ['experience_booking', 'expertise_booking', 'withdrawal', 'refund', 'all'],
        default: 'all',
        description: 'Filter by transaction type',
      },
      status: {
        type: 'string',
        enum: ['pending', 'completed', 'failed', 'all'],
        default: 'all',
        description: 'Filter by transaction status',
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
 * Create withdrawal
 * POST /api/v1/hub/:hubId/transactions/withdrawals
 */
export const hubCreateWithdrawalSchema = {
  tags: ['Hub Transactions'],
  summary: 'Create withdrawal',
  description: 'Create a new withdrawal (payout) to bank account',
  params: hubIdParam,
  body: {
    type: 'object',
    required: ['amount'],
    properties: {
      amount: {
        type: 'number',
        minimum: 100, // Minimum 1.00 MYR (in cents)
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

/**
 * List withdrawals
 * GET /api/v1/hub/:hubId/transactions/withdrawals
 */
export const hubListWithdrawalsSchema = {
  tags: ['Hub Transactions'],
  summary: 'List withdrawals',
  description: 'Get list of withdrawal/payout history',
  params: hubIdParam,
  querystring: {
    type: 'object',
    properties: {
      status: {
        type: 'string',
        enum: ['pending', 'in_transit', 'paid', 'failed', 'cancelled', 'all'],
        default: 'all',
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
        description: 'Cursor for pagination (withdrawal ID)',
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
                  failureMessage: { type: 'string' },
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
 * Get withdrawal details
 * GET /api/v1/hub/:hubId/transactions/withdrawals/:withdrawalId
 */
export const hubGetWithdrawalSchema = {
  tags: ['Hub Transactions'],
  summary: 'Get withdrawal details',
  description: 'Get details of a single withdrawal',
  params: {
    type: 'object',
    required: ['hubId', 'withdrawalId'],
    properties: {
      hubId: {
        type: 'string',
        minLength: 24,
        maxLength: 24,
        description: 'Hub ID',
      },
      withdrawalId: {
        type: 'string',
        description: 'Withdrawal ID',
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
            id: { type: 'string' },
            amount: { type: 'number' },
            currency: { type: 'string' },
            status: { type: 'string' },
            arrivalDate: { type: 'string', format: 'date-time' },
            bankAccountLast4: { type: 'string' },
            bankName: { type: 'string' },
            description: { type: 'string' },
            failureMessage: { type: 'string' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
      },
    },
  },
} as const;

/**
 * Cancel withdrawal
 * DELETE /api/v1/hub/:hubId/transactions/withdrawals/:withdrawalId
 */
export const hubCancelWithdrawalSchema = {
  tags: ['Hub Transactions'],
  summary: 'Cancel withdrawal',
  description: 'Cancel a pending withdrawal',
  params: {
    type: 'object',
    required: ['hubId', 'withdrawalId'],
    properties: {
      hubId: {
        type: 'string',
        minLength: 24,
        maxLength: 24,
        description: 'Hub ID',
      },
      withdrawalId: {
        type: 'string',
        description: 'Withdrawal ID',
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
            id: { type: 'string' },
            status: { type: 'string' },
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
 * GET /api/v1/hub/:hubId/transactions/bank-accounts
 */
export const hubListBankAccountsSchema = {
  tags: ['Hub Transactions'],
  summary: 'List bank accounts',
  description: 'Get list of connected bank accounts for withdrawals',
  params: hubIdParam,
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

/**
 * Add bank account
 * POST /api/v1/hub/:hubId/transactions/bank-accounts
 */
export const hubAddBankAccountSchema = {
  tags: ['Hub Transactions'],
  summary: 'Add bank account',
  description: 'Add a new bank account for withdrawals',
  params: hubIdParam,
  body: {
    type: 'object',
    required: ['accountNumber', 'routingNumber', 'accountHolderName', 'accountHolderType'],
    properties: {
      accountNumber: {
        type: 'string',
        minLength: 5,
        maxLength: 20,
        description: 'Bank account number',
      },
      routingNumber: {
        type: 'string',
        minLength: 6,
        maxLength: 11,
        description: 'Bank routing/swift code',
      },
      accountHolderName: {
        type: 'string',
        minLength: 2,
        maxLength: 100,
        description: 'Name on the bank account',
      },
      accountHolderType: {
        type: 'string',
        enum: ['individual', 'company'],
        description: 'Type of account holder',
      },
      currency: {
        type: 'string',
        default: 'MYR',
        description: 'Currency code',
      },
      country: {
        type: 'string',
        default: 'MY',
        description: 'Country code',
      },
      setAsDefault: {
        type: 'boolean',
        default: false,
        description: 'Set as default bank account',
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
    },
  },
} as const;

/**
 * Get bank account details
 * GET /api/v1/hub/:hubId/transactions/bank-accounts/:bankAccountId
 */
export const hubGetBankAccountSchema = {
  tags: ['Hub Transactions'],
  summary: 'Get bank account details',
  description: 'Get details of a single bank account',
  params: {
    type: 'object',
    required: ['hubId', 'bankAccountId'],
    properties: {
      hubId: {
        type: 'string',
        minLength: 24,
        maxLength: 24,
        description: 'Hub ID',
      },
      bankAccountId: {
        type: 'string',
        description: 'Bank account ID',
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
    },
  },
} as const;

/**
 * Update bank account
 * PATCH /api/v1/hub/:hubId/transactions/bank-accounts/:bankAccountId
 */
export const hubUpdateBankAccountSchema = {
  tags: ['Hub Transactions'],
  summary: 'Update bank account',
  description: 'Update bank account details (limited fields)',
  params: {
    type: 'object',
    required: ['hubId', 'bankAccountId'],
    properties: {
      hubId: {
        type: 'string',
        minLength: 24,
        maxLength: 24,
        description: 'Hub ID',
      },
      bankAccountId: {
        type: 'string',
        description: 'Bank account ID',
      },
    },
  },
  body: {
    type: 'object',
    properties: {
      accountHolderName: {
        type: 'string',
        minLength: 2,
        maxLength: 100,
        description: 'Name on the bank account',
      },
      accountHolderType: {
        type: 'string',
        enum: ['individual', 'company'],
        description: 'Type of account holder',
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
            id: { type: 'string' },
            bankName: { type: 'string' },
            last4: { type: 'string' },
            accountHolderName: { type: 'string' },
            accountHolderType: { type: 'string' },
            isDefault: { type: 'boolean' },
          },
        },
      },
    },
  },
} as const;

/**
 * Delete bank account
 * DELETE /api/v1/hub/:hubId/transactions/bank-accounts/:bankAccountId
 */
export const hubDeleteBankAccountSchema = {
  tags: ['Hub Transactions'],
  summary: 'Delete bank account',
  description: 'Remove a bank account from the hub',
  params: {
    type: 'object',
    required: ['hubId', 'bankAccountId'],
    properties: {
      hubId: {
        type: 'string',
        minLength: 24,
        maxLength: 24,
        description: 'Hub ID',
      },
      bankAccountId: {
        type: 'string',
        description: 'Bank account ID',
      },
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
} as const;

/**
 * Set default bank account
 * POST /api/v1/hub/:hubId/transactions/bank-accounts/:bankAccountId/default
 */
export const hubSetDefaultBankAccountSchema = {
  tags: ['Hub Transactions'],
  summary: 'Set default bank account',
  description: 'Set a bank account as the default for withdrawals',
  params: {
    type: 'object',
    required: ['hubId', 'bankAccountId'],
    properties: {
      hubId: {
        type: 'string',
        minLength: 24,
        maxLength: 24,
        description: 'Hub ID',
      },
      bankAccountId: {
        type: 'string',
        description: 'Bank account ID',
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
            id: { type: 'string' },
            isDefault: { type: 'boolean' },
          },
        },
      },
    },
  },
} as const;

/**
 * Get supported banks
 * GET /api/v1/hub/:hubId/transactions/bank-accounts/supported-banks
 */
export const hubGetSupportedBanksSchema = {
  tags: ['Hub Transactions'],
  summary: 'Get supported banks',
  description: 'Get list of supported banks for Malaysia',
  params: hubIdParam,
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
                  code: { type: 'string' },
                  name: { type: 'string' },
                  id: { type: 'string' },
                  logoUrl: { type: 'string' },
                },
              },
            },
          },
        },
      },
    },
  },
} as const;

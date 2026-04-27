/**
 * Admin Transaction Schema - JSON Schema definitions for admin transaction endpoints
 */

export const listTransactionsSchema = {
  tags: ['Admin - Finance'],
  summary: 'List all transactions',
  description: 'Get paginated list of transactions with filtering and sorting',
  querystring: {
    type: 'object',
    properties: {
      page: { type: 'integer', minimum: 1, default: 1 },
      limit: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
      type: {
        type: 'string',
        enum: [
          'booking_payment',
          'milestone_fund',
          'timelog_payment',
          'milestone_release',
          'expert_transfer',
          'withdrawal',
          'refund',
          'transfer_reversal',
          'platform_fee',
        ],
      },
      status: {
        type: 'string',
        enum: [
          'pending',
          'processing',
          'succeeded',
          'failed',
          'refunded',
          'partially_refunded',
          'cancelled',
        ],
      },
      direction: {
        type: 'string',
        enum: ['inbound', 'outbound', 'internal'],
      },
      search: { type: 'string' },
      startDate: { type: 'string', format: 'date' },
      endDate: { type: 'string', format: 'date' },
      sortBy: { type: 'string', default: 'createdAt' },
      sortOrder: { type: 'string', enum: ['asc', 'desc'], default: 'desc' },
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
            items: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  _id: { type: 'string' },
                  type: { type: 'string' },
                  direction: { type: 'string' },
                  referenceId: { type: 'string' },
                  amount: { type: 'number' },
                  currency: { type: 'string' },
                  platformFee: { type: 'number' },
                  stripeFee: { type: 'number' },
                  transferAmount: { type: 'number' },
                  status: { type: 'string' },
                  description: { type: 'string' },
                  fromUser: {
                    type: 'object',
                    properties: {
                      _id: { type: 'string' },
                      name: { type: 'string' },
                      email: { type: 'string' },
                    },
                  },
                  toUser: {
                    type: 'object',
                    properties: {
                      _id: { type: 'string' },
                      name: { type: 'string' },
                      email: { type: 'string' },
                    },
                  },
                  hub: {
                    type: 'object',
                    properties: {
                      _id: { type: 'string' },
                      name: { type: 'string' },
                    },
                  },
                  createdAt: { type: 'string' },
                },
              },
            },
            pagination: {
              type: 'object',
              properties: {
                total: { type: 'integer' },
                page: { type: 'integer' },
                limit: { type: 'integer' },
                totalPages: { type: 'integer' },
              },
            },
          },
        },
      },
    },
  },
} as const;

export const getTransactionStatsSchema = {
  tags: ['Admin - Finance'],
  summary: 'Get transaction statistics',
  description: 'Get aggregated transaction statistics',
  response: {
    200: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: {
          type: 'object',
          properties: {
            total: { type: 'integer' },
            totalVolume: { type: 'number' },
            totalPlatformFees: { type: 'number' },
            byStatus: {
              type: 'object',
              properties: {
                pending: { type: 'integer' },
                processing: { type: 'integer' },
                succeeded: { type: 'integer' },
                failed: { type: 'integer' },
                refunded: { type: 'integer' },
                cancelled: { type: 'integer' },
              },
            },
            byType: {
              type: 'object',
              additionalProperties: { type: 'integer' },
            },
            byDirection: {
              type: 'object',
              properties: {
                inbound: { type: 'integer' },
                outbound: { type: 'integer' },
                internal: { type: 'integer' },
              },
            },
            currency: { type: 'string' },
          },
        },
      },
    },
  },
} as const;

export const getTransactionByIdSchema = {
  tags: ['Admin - Finance'],
  summary: 'Get transaction by ID',
  description: 'Get detailed transaction information by ID',
  params: {
    type: 'object',
    required: ['id'],
    properties: {
      id: { type: 'string' },
    },
  },
  response: {
    200: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: { type: 'object', additionalProperties: true },
      },
    },
    404: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        error: {
          type: 'object',
          properties: {
            code: { type: 'string' },
            message: { type: 'string' },
          },
        },
      },
    },
  },
} as const;

export type TransactionType =
  | 'booking_payment'
  | 'milestone_fund'
  | 'timelog_payment'
  | 'milestone_release'
  | 'expert_transfer'
  | 'withdrawal'
  | 'refund'
  | 'transfer_reversal'
  | 'platform_fee';

export type TransactionStatus =
  | 'pending'
  | 'processing'
  | 'succeeded'
  | 'failed'
  | 'refunded'
  | 'partially_refunded'
  | 'cancelled';

export type TransactionDirection = 'inbound' | 'outbound' | 'internal';

export interface ListTransactionsQuery {
  page?: number;
  limit?: number;
  type?: TransactionType;
  status?: TransactionStatus;
  direction?: TransactionDirection;
  search?: string;
  startDate?: string;
  endDate?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface GetTransactionByIdParams {
  id: string;
}

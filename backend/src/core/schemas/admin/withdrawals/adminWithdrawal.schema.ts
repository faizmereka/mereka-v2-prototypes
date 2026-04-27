/**
 * Withdrawal status enum
 */
export const WithdrawalStatus = {
  PENDING: 'pending',
  IN_TRANSIT: 'in_transit',
  PAID: 'paid',
  FAILED: 'failed',
  CANCELED: 'canceled',
} as const;

export type WithdrawalStatusType = (typeof WithdrawalStatus)[keyof typeof WithdrawalStatus];

/**
 * Source type enum
 */
export const SourceType = {
  CARD: 'card',
  FPX: 'fpx',
  BANK_TRANSFER: 'bank_transfer',
} as const;

export type SourceTypeValue = (typeof SourceType)[keyof typeof SourceType];

/**
 * List withdrawals query schema
 */
export const listWithdrawalsQuerySchema = {
  type: 'object',
  properties: {
    page: { type: 'integer', minimum: 1, default: 1 },
    limit: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
    status: {
      type: 'string',
      enum: Object.values(WithdrawalStatus),
    },
    sourceType: {
      type: 'string',
      enum: Object.values(SourceType),
    },
    search: { type: 'string' },
    dateFrom: { type: 'string', format: 'date' },
    dateTo: { type: 'string', format: 'date' },
    sortBy: { type: 'string', default: 'createdAt' },
    sortOrder: { type: 'string', enum: ['asc', 'desc'], default: 'desc' },
  },
} as const;

export interface ListWithdrawalsQuery {
  page?: number;
  limit?: number;
  status?: WithdrawalStatusType;
  sourceType?: SourceTypeValue;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

/**
 * Withdrawal ID param schema
 */
export const withdrawalIdParamSchema = {
  type: 'object',
  required: ['id'],
  properties: {
    id: { type: 'string', minLength: 24, maxLength: 24 },
  },
} as const;

export interface WithdrawalIdParam {
  id: string;
}

/**
 * Approve withdrawal body schema
 */
export const approveWithdrawalBodySchema = {
  type: 'object',
  properties: {
    note: { type: 'string', maxLength: 500 },
  },
} as const;

export interface ApproveWithdrawalBody {
  note?: string;
}

/**
 * Reject withdrawal body schema
 */
export const rejectWithdrawalBodySchema = {
  type: 'object',
  required: ['reason'],
  properties: {
    reason: { type: 'string', minLength: 1, maxLength: 500 },
  },
} as const;

export interface RejectWithdrawalBody {
  reason: string;
}

/**
 * Withdrawal response interface
 */
export interface WithdrawalResponse {
  _id: string;
  userId: string;
  stripeAccountId?: string;
  stripePayoutId?: string;
  amount: number;
  currency: string;
  bankAccountId?: string;
  sourceType: SourceTypeValue;
  status: WithdrawalStatusType;
  description?: string;
  requestedBy?: string;
  approvedBy?: string;
  arrivalDate?: string;
  completedDate?: string;
  createdAt: string;
  updatedAt: string;
  user?: {
    _id: string;
    name: string;
    email: string;
  };
  hub?: {
    _id: string;
    name: string;
  };
  bankAccount?: {
    bankName: string;
    accountNumber: string;
    accountHolderName: string;
  };
}

/**
 * Withdrawal stats response interface
 */
export interface WithdrawalStatsResponse {
  total: number;
  totalAmount: number;
  pendingAmount: number;
  completedAmount: number;
  byStatus: Record<WithdrawalStatusType, number>;
  bySourceType: Record<SourceTypeValue, number>;
  currency: string;
}

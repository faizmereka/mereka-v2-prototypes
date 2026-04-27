/**
 * Learner Account Schema
 * GET /me/account - Returns account details for authenticated learner
 * PUT /me/account - Updates account details for authenticated learner
 */

// ============================================================================
// Response Schemas
// ============================================================================

export const learnerAccountResponseSchema = {
  type: 'object',
  properties: {
    accountType: { type: 'string' },
    displayName: { type: 'string' },
    username: { type: 'string', nullable: true },
    email: { type: 'string' },
    phoneNumber: { type: 'string', nullable: true },
    birthDate: { type: 'string', nullable: true },
    language: { type: 'string', nullable: true },
    currency: { type: 'string' },
    timeZone: { type: 'string' },
    emailVerified: { type: 'boolean' },
    profilePhoto: { type: 'string', nullable: true },
  },
} as const;

// ============================================================================
// Request Schemas
// ============================================================================

export const updateLearnerAccountSchema = {
  body: {
    type: 'object',
    properties: {
      displayName: { type: 'string', minLength: 2, maxLength: 100 },
      username: { type: 'string', minLength: 6, maxLength: 30, pattern: '^[a-z0-9_]+$' },
      birthDate: { type: 'string', format: 'date' },
      language: { type: 'string', enum: ['en', 'ms', 'zh', 'ta'] },
      currency: { type: 'string', enum: ['MYR', 'USD', 'SGD', 'IDR'] },
      timeZone: { type: 'string' },
    },
    additionalProperties: false,
  },
} as const;

// ============================================================================
// TypeScript Types
// ============================================================================

export interface LearnerAccountResponse {
  accountType: string;
  displayName: string;
  username: string | null;
  email: string;
  phoneNumber: string | null;
  birthDate: string | null;
  language: string | null;
  currency: string;
  timeZone: string;
  emailVerified: boolean;
  profilePhoto: string | null;
}

export interface UpdateLearnerAccountInput {
  displayName?: string;
  username?: string;
  birthDate?: string;
  language?: string;
  currency?: string;
  timeZone?: string;
}

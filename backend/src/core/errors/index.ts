/**
 * Custom Error Classes for Contract Payment System
 *
 * Provides typed errors with error codes for consistent error handling
 * across the application and API responses.
 */

/**
 * Base application error
 */
export class AppError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly details?: Record<string, unknown>;

  constructor(
    code: string,
    message: string,
    statusCode = 500,
    isOperational = true,
    details?: Record<string, unknown>,
  ) {
    super(message);
    this.code = code;
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.details = details;
    this.name = this.constructor.name;

    // Capture stack trace
    Error.captureStackTrace(this, this.constructor);
  }

  toJSON() {
    return {
      code: this.code,
      message: this.message,
      statusCode: this.statusCode,
      ...(this.details && { details: this.details }),
    };
  }
}

/**
 * Validation error - 400
 */
export class ValidationError extends AppError {
  constructor(message: string, details?: Record<string, unknown>) {
    super('VALIDATION_ERROR', message, 400, true, details);
  }
}

/**
 * Not found error - 404
 */
export class NotFoundError extends AppError {
  constructor(resource: string, id?: string) {
    const message = id ? `${resource} with ID ${id} not found` : `${resource} not found`;
    super('NOT_FOUND', message, 404, true, { resource, id });
  }
}

/**
 * Unauthorized error - 401
 */
export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized') {
    super('UNAUTHORIZED', message, 401, true);
  }
}

/**
 * Forbidden error - 403
 */
export class ForbiddenError extends AppError {
  constructor(message = 'Forbidden') {
    super('FORBIDDEN', message, 403, true);
  }
}

/**
 * Conflict error - 409
 */
export class ConflictError extends AppError {
  constructor(message: string, details?: Record<string, unknown>) {
    super('CONFLICT', message, 409, true, details);
  }
}

// =============================================================================
// Contract-Specific Errors
// =============================================================================

/**
 * Contract error codes
 */
export enum ContractErrorCode {
  // General
  CONTRACT_NOT_FOUND = 'CONTRACT_NOT_FOUND',
  INVALID_CONTRACT_STATUS = 'INVALID_CONTRACT_STATUS',

  // Offer flow
  OFFER_ALREADY_SENT = 'OFFER_ALREADY_SENT',
  OFFER_ALREADY_ACCEPTED = 'OFFER_ALREADY_ACCEPTED',
  OFFER_ALREADY_DECLINED = 'OFFER_ALREADY_DECLINED',
  CANNOT_ACCEPT_OWN_OFFER = 'CANNOT_ACCEPT_OWN_OFFER',

  // Terms
  INVALID_TERMS_UPDATE = 'INVALID_TERMS_UPDATE',
  TERMS_UPDATE_PENDING = 'TERMS_UPDATE_PENDING',
}

/**
 * Contract error
 */
export class ContractError extends AppError {
  constructor(code: ContractErrorCode, message: string, details?: Record<string, unknown>) {
    super(code, message, 400, true, details);
  }
}

// =============================================================================
// Milestone-Specific Errors
// =============================================================================

/**
 * Milestone error codes
 */
export enum MilestoneErrorCode {
  MILESTONE_NOT_FOUND = 'MILESTONE_NOT_FOUND',
  INVALID_MILESTONE_STATUS = 'INVALID_MILESTONE_STATUS',
  MILESTONE_ALREADY_FUNDED = 'MILESTONE_ALREADY_FUNDED',
  MILESTONE_NOT_FUNDED = 'MILESTONE_NOT_FUNDED',
  WORK_NOT_SUBMITTED = 'WORK_NOT_SUBMITTED',
  CANNOT_EDIT_MILESTONE = 'CANNOT_EDIT_MILESTONE',
  CANNOT_DELETE_MILESTONE = 'CANNOT_DELETE_MILESTONE',
  MILESTONE_OVERDUE = 'MILESTONE_OVERDUE',
}

/**
 * Milestone error
 */
export class MilestoneError extends AppError {
  constructor(code: MilestoneErrorCode, message: string, details?: Record<string, unknown>) {
    super(code, message, 400, true, details);
  }
}

// =============================================================================
// Payment-Specific Errors
// =============================================================================

/**
 * Payment error codes
 */
export enum PaymentErrorCode {
  // General payment errors
  PAYMENT_NOT_FOUND = 'PAYMENT_NOT_FOUND',
  PAYMENT_ALREADY_PROCESSED = 'PAYMENT_ALREADY_PROCESSED',
  PAYMENT_FAILED = 'PAYMENT_FAILED',
  INSUFFICIENT_FUNDS = 'INSUFFICIENT_FUNDS',

  // Stripe errors
  STRIPE_ERROR = 'STRIPE_ERROR',
  STRIPE_CARD_DECLINED = 'STRIPE_CARD_DECLINED',
  STRIPE_INVALID_PAYMENT_METHOD = 'STRIPE_INVALID_PAYMENT_METHOD',
  NO_PAYMENT_METHOD = 'NO_PAYMENT_METHOD',

  // Escrow errors
  ESCROW_FUNDING_FAILED = 'ESCROW_FUNDING_FAILED',
  ESCROW_CAPTURE_FAILED = 'ESCROW_CAPTURE_FAILED',
  ESCROW_NOT_FOUND = 'ESCROW_NOT_FOUND',

  // Transfer errors
  TRANSFER_FAILED = 'TRANSFER_FAILED',
  NO_CONNECT_ACCOUNT = 'NO_CONNECT_ACCOUNT',
  INVALID_TRANSFER_AMOUNT = 'INVALID_TRANSFER_AMOUNT',

  // Refund errors
  REFUND_FAILED = 'REFUND_FAILED',
  REFUND_AMOUNT_EXCEEDS_CHARGE = 'REFUND_AMOUNT_EXCEEDS_CHARGE',

  // Idempotency
  DUPLICATE_PAYMENT = 'DUPLICATE_PAYMENT',

  // Status errors
  INVALID_PAYMENT_STATUS = 'INVALID_PAYMENT_STATUS',
  CANNOT_RELEASE_PAYMENT = 'CANNOT_RELEASE_PAYMENT',
  CANNOT_REFUND_PAYMENT = 'CANNOT_REFUND_PAYMENT',
}

/**
 * Payment error
 */
export class PaymentError extends AppError {
  public readonly stripeErrorCode?: string;

  constructor(
    code: PaymentErrorCode,
    message: string,
    details?: Record<string, unknown>,
    stripeErrorCode?: string,
  ) {
    super(code, message, 400, true, details);
    this.stripeErrorCode = stripeErrorCode;
  }

  static fromStripeError(error: { code?: string; message: string }): PaymentError {
    const code = mapStripeErrorCode(error.code);
    return new PaymentError(code, error.message, undefined, error.code);
  }
}

/**
 * Map Stripe error codes to our payment error codes
 */
function mapStripeErrorCode(stripeCode?: string): PaymentErrorCode {
  switch (stripeCode) {
    case 'card_declined':
    case 'insufficient_funds':
    case 'do_not_honor':
      return PaymentErrorCode.STRIPE_CARD_DECLINED;
    case 'invalid_card_number':
    case 'invalid_cvc':
    case 'invalid_expiry_month':
    case 'invalid_expiry_year':
    case 'incorrect_number':
    case 'incorrect_cvc':
    case 'expired_card':
      return PaymentErrorCode.STRIPE_INVALID_PAYMENT_METHOD;
    default:
      return PaymentErrorCode.STRIPE_ERROR;
  }
}

// =============================================================================
// Timelog-Specific Errors
// =============================================================================

/**
 * Timelog error codes
 */
export enum TimelogErrorCode {
  TIMELOG_NOT_FOUND = 'TIMELOG_NOT_FOUND',
  INVALID_TIMELOG_STATUS = 'INVALID_TIMELOG_STATUS',
  WEEKLY_LIMIT_EXCEEDED = 'WEEKLY_LIMIT_EXCEEDED',
  CANNOT_EDIT_TIMELOG = 'CANNOT_EDIT_TIMELOG',
  CANNOT_DELETE_TIMELOG = 'CANNOT_DELETE_TIMELOG',
  DUPLICATE_TIMELOG_ENTRY = 'DUPLICATE_TIMELOG_ENTRY',
  INVALID_TIME_RANGE = 'INVALID_TIME_RANGE',
}

/**
 * Timelog error
 */
export class TimelogError extends AppError {
  constructor(code: TimelogErrorCode, message: string, details?: Record<string, unknown>) {
    super(code, message, 400, true, details);
  }
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Check if error is an operational error (expected, can be handled gracefully)
 */
export function isOperationalError(error: unknown): error is AppError {
  return error instanceof AppError && error.isOperational;
}

/**
 * Wrap unknown errors into AppError
 */
export function wrapError(error: unknown): AppError {
  if (error instanceof AppError) {
    return error;
  }

  if (error instanceof Error) {
    return new AppError('INTERNAL_ERROR', error.message, 500, false);
  }

  return new AppError('INTERNAL_ERROR', 'An unexpected error occurred', 500, false);
}

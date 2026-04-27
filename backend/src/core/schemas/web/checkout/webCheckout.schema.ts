import type { FastifySchema } from 'fastify';

// ============================================================================
// Types - Request Interfaces for Web Checkout
// ============================================================================

/**
 * Ticket selection for checkout
 */
export interface CheckoutTicketInput {
  ticketId: string;
  quantity: number;
}

/**
 * Learner details for booking
 */
export interface CheckoutLearnerInput {
  name: string;
  email: string;
  phone: string;
  countryCode?: string; // Optional - can be included in phone
}

/**
 * Experience checkout initialization request
 */
export interface InitExperienceCheckoutInput {
  experienceSlug: string;
  eventId: string;
  tickets: CheckoutTicketInput[];
}

/**
 * Experience payment request
 * Supports both legacy Card Element flow (paymentMethodId) and new Payment Element flow (paymentIntentId)
 */
export interface ProcessExperiencePaymentInput {
  holdId?: string; // Optional for guest checkout
  // Legacy Card Element flow
  paymentMethodId?: string;
  // New Payment Element flow - payment already confirmed client-side
  paymentIntentId?: string;
  // Alternative fields for guest checkout (when no holdId)
  experienceId?: string;
  eventId?: string;
  tickets?: CheckoutTicketInput[];
  // Common fields
  learners: CheckoutLearnerInput[];
  questionnaire?: Record<string, string | string[]>;
  couponCode?: string;
}

/**
 * Expertise checkout initialization request
 */
export interface InitExpertiseCheckoutInput {
  expertiseSlug: string;
  ticketId: string;
  date: string;
  time: string;
}

/**
 * Expertise payment request
 */
export interface ProcessExpertisePaymentInput {
  expertiseId: string;
  ticketId: string;
  date: string;
  time: string;
  paymentMethodId: string;
  learner: CheckoutLearnerInput;
  questionnaire?: Record<string, string | string[]>;
  couponCode?: string;
}

/**
 * Coupon validation request
 */
export interface ValidateCouponInput {
  code: string;
  serviceType: 'experience' | 'expertise';
  serviceId: string;
  amount: number;
}

/**
 * Slot hold release request
 */
export interface ReleaseHoldInput {
  holdId: string;
}

/**
 * Slot hold extend request
 */
export interface ExtendHoldInput {
  holdId: string;
}

// ============================================================================
// Types - Response Interfaces for Web Checkout
// ============================================================================

/**
 * Pricing breakdown for checkout
 */
export interface CheckoutPricing {
  currency: string;
  subtotal: number;
  serviceFee: number;
  discount: number;
  total: number;
  isHubPayingFee: boolean;
  platformFeeRate: number;
}

/**
 * Ticket info in checkout response
 */
export interface CheckoutTicketInfo {
  ticketId: string;
  name: string;
  unitPrice: number;
  quantity: number;
  subtotal: number;
}

/**
 * Experience info in checkout response
 */
export interface CheckoutExperienceInfo {
  _id: string;
  title: string;
  slug: string;
  coverPhoto?: string;
  experienceType: string;
  hub: {
    _id: string;
    name: string;
    slug: string;
    logo?: string;
  };
  location?: {
    venueName?: string;
    address?: string;
    city?: string;
    country?: string;
  };
}

/**
 * Event info in checkout response
 */
export interface CheckoutEventInfo {
  _id: string;
  startTime: string;
  endTime: string;
  timeZone: string;
}

/**
 * Questionnaire question
 */
export interface CheckoutQuestion {
  questionLabel: string;
  questionType: 'text' | 'dropdown' | 'checkbox' | 'multiple_choice';
  dropDown?: string[];
  checkBox?: string[];
  multipleChoices?: string[];
}

/**
 * Experience checkout initialization response
 */
export interface InitExperienceCheckoutResponse {
  holdId: string;
  holdExpiresAt: string;
  experience: CheckoutExperienceInfo;
  event: CheckoutEventInfo;
  tickets: CheckoutTicketInfo[];
  pricing: CheckoutPricing;
  questionnaire: CheckoutQuestion[] | null;
}

/**
 * Expertise info in checkout response
 */
export interface CheckoutExpertiseInfo {
  _id: string;
  title: string;
  slug: string;
  coverPhoto?: string;
  expertiseType: string;
  host: {
    name: string;
    profileUrl?: string;
  };
  hub: {
    _id: string;
    name: string;
    slug: string;
    logo?: string;
  };
}

/**
 * Session info in checkout response
 */
export interface CheckoutSessionInfo {
  date: string;
  startTime: string;
  endTime: string;
  timeZone: string;
  durationMinutes: number;
}

/**
 * Ticket info for expertise checkout
 */
export interface CheckoutExpertiseTicketInfo {
  ticketId: string;
  name: string;
  unitPrice: number;
  sessionDuration: number;
  durationUnit: string;
  mode: string;
}

/**
 * Expertise checkout initialization response
 */
export interface InitExpertiseCheckoutResponse {
  expertise: CheckoutExpertiseInfo;
  ticket: CheckoutExpertiseTicketInfo;
  session: CheckoutSessionInfo;
  pricing: CheckoutPricing;
  questionnaire: CheckoutQuestion[] | null;
  instantBooking: boolean;
}

/**
 * Payment processing response
 */
export interface PaymentResponse {
  success: boolean;
  bookingId: string;
  bookingReference: string;
  status: 'ACTIVE' | 'PENDING';
}

/**
 * Coupon validation response
 */
export interface ValidateCouponResponse {
  valid: boolean;
  message: string;
  couponId?: string;
  couponCode?: string;
  couponType?: string;
  discountType?: string;
  discountValue?: number;
  discount?: number;
  maxDiscount?: number;
}

/**
 * Hold operation response
 */
export interface HoldOperationResponse {
  success: boolean;
  message?: string;
  expiresAt?: string;
}

// ============================================================================
// JSON Schema Definitions for Validation
// ============================================================================

const ticketInputSchema = {
  type: 'object',
  required: ['ticketId', 'quantity'],
  properties: {
    ticketId: { type: 'string', minLength: 1 },
    quantity: { type: 'number', minimum: 1, maximum: 20 },
  },
  additionalProperties: false,
} as const;

const learnerInputSchema = {
  type: 'object',
  required: ['name', 'email', 'phone'],
  properties: {
    name: { type: 'string', minLength: 1, maxLength: 100 },
    email: { type: 'string', format: 'email' },
    phone: { type: 'string', minLength: 5, maxLength: 30 }, // Allow phone with or without country code
    countryCode: { type: 'string', minLength: 1, maxLength: 5 }, // Optional - can be included in phone
  },
  additionalProperties: false,
} as const;

// ============================================================================
// Experience Checkout Schemas
// ============================================================================

export const initExperienceCheckoutBodySchema = {
  type: 'object',
  required: ['experienceSlug', 'eventId', 'tickets'],
  properties: {
    experienceSlug: { type: 'string', minLength: 1 },
    eventId: { type: 'string', minLength: 1 },
    tickets: {
      type: 'array',
      items: ticketInputSchema,
      minItems: 1,
      maxItems: 10,
    },
  },
  additionalProperties: false,
} as const;

export const processExperiencePaymentBodySchema = {
  type: 'object',
  required: ['learners'],
  properties: {
    // Optional holdId - for guest checkout without hold
    holdId: { type: 'string' },
    // Legacy Card Element flow - send paymentMethodId
    paymentMethodId: { type: 'string' },
    // New Payment Element flow - payment confirmed client-side, send paymentIntentId to verify
    paymentIntentId: { type: 'string' },
    // Alternative fields for guest checkout without holdId
    experienceId: { type: 'string' },
    eventId: { type: 'string' },
    tickets: {
      type: 'array',
      items: ticketInputSchema,
      minItems: 1,
      maxItems: 10,
    },
    // Common fields
    learners: {
      type: 'array',
      items: learnerInputSchema,
      minItems: 1,
      maxItems: 50,
    },
    questionnaire: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          questionLabel: { type: 'string' },
          answer: {
            oneOf: [{ type: 'string' }, { type: 'array', items: { type: 'string' } }],
          },
        },
      },
    },
    couponCode: { type: 'string', minLength: 1, maxLength: 50 },
  },
  additionalProperties: false,
} as const;

// ============================================================================
// Expertise Checkout Schemas
// ============================================================================

export const initExpertiseCheckoutBodySchema = {
  type: 'object',
  required: ['expertiseSlug', 'ticketId', 'date', 'time'],
  properties: {
    expertiseSlug: { type: 'string', minLength: 1 },
    ticketId: { type: 'string', minLength: 1 },
    date: { type: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}$' }, // YYYY-MM-DD
    time: { type: 'string', pattern: '^\\d{2}:\\d{2}$' }, // HH:mm
  },
  additionalProperties: false,
} as const;

export const processExpertisePaymentBodySchema = {
  type: 'object',
  required: ['expertiseId', 'ticketId', 'date', 'time', 'paymentMethodId', 'learner'],
  properties: {
    expertiseId: { type: 'string', minLength: 1 },
    ticketId: { type: 'string', minLength: 1 },
    date: { type: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}$' },
    time: { type: 'string', pattern: '^\\d{2}:\\d{2}$' },
    paymentMethodId: { type: 'string', minLength: 1 },
    learner: learnerInputSchema,
    questionnaire: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          questionLabel: { type: 'string' },
          answer: {
            oneOf: [{ type: 'string' }, { type: 'array', items: { type: 'string' } }],
          },
        },
      },
    },
    couponCode: { type: 'string', minLength: 1, maxLength: 50 },
  },
  additionalProperties: false,
} as const;

// ============================================================================
// Coupon Validation Schema
// ============================================================================

export const validateCouponBodySchema = {
  type: 'object',
  required: ['code', 'serviceType', 'serviceId', 'amount'],
  properties: {
    code: { type: 'string', minLength: 1, maxLength: 50 },
    serviceType: { type: 'string', enum: ['experience', 'expertise'] },
    serviceId: { type: 'string', minLength: 1 },
    amount: { type: 'number', minimum: 0 },
  },
  additionalProperties: false,
} as const;

// ============================================================================
// Slot Hold Management Schemas
// ============================================================================

export const releaseHoldBodySchema = {
  type: 'object',
  required: ['holdId'],
  properties: {
    holdId: { type: 'string', minLength: 1 },
  },
  additionalProperties: false,
} as const;

export const extendHoldBodySchema = {
  type: 'object',
  required: ['holdId'],
  properties: {
    holdId: { type: 'string', minLength: 1 },
  },
  additionalProperties: false,
} as const;

// ============================================================================
// Fastify Route Schemas
// ============================================================================

export const initExperienceCheckoutSchema: FastifySchema = {
  body: initExperienceCheckoutBodySchema,
  tags: ['Web - Checkout'],
  summary: 'Initialize experience checkout',
  description:
    'Creates a slot hold and returns checkout data including experience details, pricing, and hold expiry time. Hold expires in 15 minutes.',
};

export const processExperiencePaymentSchema: FastifySchema = {
  body: processExperiencePaymentBodySchema,
  tags: ['Web - Checkout'],
  summary: 'Process experience payment',
  description:
    'Validates hold, processes Stripe payment, creates booking, and confirms the slot hold. Returns booking ID and reference.',
};

export const initExpertiseCheckoutSchema: FastifySchema = {
  body: initExpertiseCheckoutBodySchema,
  tags: ['Web - Checkout'],
  summary: 'Initialize expertise checkout',
  description:
    'Returns checkout data including expertise details, session info, and pricing. No slot hold is created for expertise.',
};

export const processExpertisePaymentSchema: FastifySchema = {
  body: processExpertisePaymentBodySchema,
  tags: ['Web - Checkout'],
  summary: 'Process expertise payment',
  description:
    'Processes Stripe payment and creates expertise booking. Returns booking ID, reference, and status (ACTIVE or PENDING based on instantBooking).',
};

export const validateCouponSchema: FastifySchema = {
  body: validateCouponBodySchema,
  tags: ['Web - Checkout'],
  summary: 'Validate coupon code',
  description:
    'Validates a coupon code for a specific service and amount. Returns discount information if valid.',
};

export const releaseHoldSchema: FastifySchema = {
  body: releaseHoldBodySchema,
  tags: ['Web - Checkout'],
  summary: 'Release slot hold',
  description:
    'Manually releases a slot hold when user abandons checkout. Hold is automatically released on expiry.',
};

export const extendHoldSchema: FastifySchema = {
  body: extendHoldBodySchema,
  tags: ['Web - Checkout'],
  summary: 'Extend slot hold',
  description:
    'Extends the hold expiry time by another 15 minutes. Can only be extended if hold is still active.',
};

// ============================================================================
// Free Checkout Schemas (for tickets with zero total)
// ============================================================================

export const processExperienceFreeCheckoutBodySchema = {
  type: 'object',
  required: ['holdId', 'learners'],
  properties: {
    holdId: { type: 'string', minLength: 1 },
    learners: {
      type: 'array',
      items: learnerInputSchema,
      minItems: 1,
      maxItems: 50,
    },
    questionnaire: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          questionLabel: { type: 'string' },
          answer: {
            oneOf: [{ type: 'string' }, { type: 'array', items: { type: 'string' } }],
          },
        },
      },
    },
    couponCode: { type: 'string', minLength: 1, maxLength: 50 },
  },
  additionalProperties: false,
} as const;

export const processExpertiseFreeCheckoutBodySchema = {
  type: 'object',
  required: ['expertiseId', 'ticketId', 'date', 'time', 'learner'],
  properties: {
    expertiseId: { type: 'string', minLength: 1 },
    ticketId: { type: 'string', minLength: 1 },
    date: { type: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}$' },
    time: { type: 'string', pattern: '^\\d{2}:\\d{2}$' },
    learner: learnerInputSchema,
    questionnaire: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          questionLabel: { type: 'string' },
          answer: {
            oneOf: [{ type: 'string' }, { type: 'array', items: { type: 'string' } }],
          },
        },
      },
    },
    couponCode: { type: 'string', minLength: 1, maxLength: 50 },
  },
  additionalProperties: false,
} as const;

export const processExperienceFreeCheckoutSchema: FastifySchema = {
  body: processExperienceFreeCheckoutBodySchema,
  tags: ['Web - Checkout'],
  summary: 'Process free experience checkout',
  description:
    'Creates a free booking without payment processing. Used when total is zero (free tickets or 100% discount).',
};

export const processExpertiseFreeCheckoutSchema: FastifySchema = {
  body: processExpertiseFreeCheckoutBodySchema,
  tags: ['Web - Checkout'],
  summary: 'Process free expertise checkout',
  description:
    'Creates a free expertise booking without payment processing. Used when total is zero.',
};

import { ContractStatus, TermsUpdateStatus } from '@core/models/Contract';
import { PriceType } from '@core/models/JobProposal';

/**
 * Hub contract schemas - Native JSON Schema
 * Note: Date preprocessing, currency uppercase transform, and refine validations handled in controller
 */

const objectIdPattern = '^[0-9a-fA-F]{24}$';

/**
 * Pending terms update sub-schema
 * Note: Date preprocessing handled in controller
 */
const pendingTermsUpdateSchema = {
  type: 'object',
  required: ['weeklyLimit', 'hourlyRate', 'effectiveDate', 'requestedBy'],
  properties: {
    weeklyLimit: {
      type: 'number',
      minimum: 1,
      maximum: 168,
      description: 'New weekly hour limit',
    },
    hourlyRate: {
      type: 'number',
      minimum: 0,
      description: 'New hourly rate',
    },
    requestedDate: {
      type: 'string',
      format: 'date-time',
      description: 'Request date (ISO 8601, optional)',
    },
    effectiveDate: {
      type: 'string',
      format: 'date-time',
      description: 'Effective date (ISO 8601, required)',
    },
    requestedBy: {
      type: 'string',
      pattern: objectIdPattern,
      description: 'User ID who requested the update',
    },
    status: {
      type: 'string',
      enum: Object.values(TermsUpdateStatus),
      default: TermsUpdateStatus.PENDING,
      description: 'Terms update status',
    },
  },
} as const;

/**
 * Create Contract Schema
 * Note: Refine validations (conditional requirements based on priceType) handled in controller
 */
export const hubCreateContractSchema = {
  body: {
    type: 'object',
    required: [
      'jobId',
      'jobProposalId',
      'clientHubId',
      'contractTitle',
      'contractDescription',
      'priceType',
      'startDate',
      'asssignedExpertId',
    ],
    properties: {
      jobId: {
        type: 'string',
        pattern: objectIdPattern,
        description: 'Job ID',
      },
      jobProposalId: {
        type: 'string',
        pattern: objectIdPattern,
        description: 'Proposal ID',
      },
      clientHubId: {
        type: 'string',
        pattern: objectIdPattern,
        description: 'Client Hub ID (employer/job poster)',
      },
      expertHubId: {
        type: 'string',
        pattern: objectIdPattern,
        description: 'Expert Hub ID (auto-filled from expert membership)',
      },
      contractTitle: {
        type: 'string',
        minLength: 1,
        maxLength: 70,
        description: 'Contract title',
      },
      contractDescription: {
        type: 'string',
        minLength: 20,
        maxLength: 5000,
        description: 'Contract description',
      },
      contractUploads: {
        type: 'array',
        items: {
          type: 'string',
          format: 'uri',
        },
        default: [],
        description: 'Contract file URLs',
      },
      priceType: {
        type: 'string',
        enum: Object.values(PriceType),
        description: 'Price type',
      },
      proposedPrice: {
        type: 'number',
        minimum: 0,
        description: 'Proposed price (required for fixed price)',
      },
      hasMilestones: {
        type: 'boolean',
        default: false,
        description: 'Whether contract has milestones',
      },
      hourlyProposedPrice: {
        type: 'number',
        minimum: 0,
        description: 'Hourly rate (required for hourly)',
      },
      weeklyLimit: {
        type: 'number',
        minimum: 1,
        maximum: 168,
        description: 'Weekly hour limit (for hourly contracts)',
      },
      startDate: {
        type: 'string',
        format: 'date-time',
        description: 'Contract start date (ISO 8601, will be converted to Date in controller)',
      },
      selectedCurrency: {
        type: 'string',
        minLength: 3,
        maxLength: 3,
        default: 'MYR',
        description: 'Currency code (3 characters, will be converted to uppercase)',
      },
      asssignedExpertId: {
        type: 'string',
        pattern: objectIdPattern,
        description: 'Assigned expert ID',
      },
      stripeCustomerId: {
        type: 'string',
        description: 'Stripe customer ID',
      },
      stripeAccount: {
        type: 'string',
        description: 'Stripe account ID',
      },
      paymentMethodId: {
        type: 'string',
        description: 'Payment method ID',
      },
    },
  },
} as const;

/**
 * Update Contract Schema
 * Note: Date preprocessing handled in controller
 */
export const hubUpdateContractSchema = {
  params: {
    type: 'object',
    required: ['contractId'],
    properties: {
      contractId: {
        type: 'string',
        pattern: objectIdPattern,
        description: 'Contract ID',
      },
    },
  },
  body: {
    type: 'object',
    properties: {
      status: {
        type: 'string',
        enum: Object.values(ContractStatus),
        description: 'Contract status',
      },
      contractTitle: {
        type: 'string',
        minLength: 1,
        maxLength: 70,
        description: 'Contract title',
      },
      contractDescription: {
        type: 'string',
        minLength: 20,
        maxLength: 5000,
        description: 'Contract description',
      },
      contractUploads: {
        type: 'array',
        items: {
          type: 'string',
          format: 'uri',
        },
        description: 'Contract file URLs',
      },
      endDate: {
        type: 'string',
        format: 'date-time',
        description: 'Contract end date (ISO 8601)',
      },
      pendingTermsUpdate: pendingTermsUpdateSchema,
      weeklyLimit: {
        type: 'number',
        minimum: 1,
        maximum: 168,
        description: 'Weekly limit (for hourly rate updates)',
      },
      hourlyProposedPrice: {
        type: 'number',
        minimum: 0,
        description: 'Hourly rate (for rate updates)',
      },
    },
  },
} as const;

/**
 * Get Contract by ID Schema
 */
export const hubGetContractSchema = {
  params: {
    type: 'object',
    required: ['contractId'],
    properties: {
      contractId: {
        type: 'string',
        pattern: objectIdPattern,
        description: 'Contract ID',
      },
    },
  },
} as const;

/**
 * Get Contracts (Query) Schema
 * Note: Number preprocessing and refine validation (at least one filter) handled in controller
 */
export const hubGetContractsSchema = {
  querystring: {
    type: 'object',
    properties: {
      clientHubId: {
        type: 'string',
        pattern: objectIdPattern,
        description: 'Client Hub ID filter (employer/job poster)',
      },
      expertHubId: {
        type: 'string',
        pattern: objectIdPattern,
        description: 'Expert Hub ID filter (expert membership)',
      },
      asssignedExpertId: {
        type: 'string',
        pattern: objectIdPattern,
        description: 'Assigned expert ID filter',
      },
      createdBy: {
        type: 'string',
        pattern: objectIdPattern,
        description: 'Created by user ID filter',
      },
      jobId: {
        type: 'string',
        pattern: objectIdPattern,
        description: 'Job ID filter',
      },
      status: {
        type: 'string',
        enum: Object.values(ContractStatus),
        description: 'Status filter',
      },
      priceType: {
        type: 'string',
        enum: Object.values(PriceType),
        description: 'Price type filter',
      },
      page: {
        type: 'number',
        minimum: 1,
        description: 'Page number',
      },
      limit: {
        type: 'number',
        minimum: 1,
        maximum: 100,
        description: 'Items per page',
      },
    },
  },
} as const;

/**
 * Cancel Contract Schema
 */
export const hubCancelContractSchema = {
  params: {
    type: 'object',
    required: ['contractId'],
    properties: {
      contractId: {
        type: 'string',
        pattern: objectIdPattern,
        description: 'Contract ID',
      },
    },
  },
  body: {
    type: 'object',
    properties: {
      reason: {
        type: 'string',
        minLength: 10,
        description: 'Cancellation reason (min 10 characters)',
      },
    },
  },
} as const;

/**
 * Pause Contract Schema
 */
export const hubPauseContractSchema = {
  params: {
    type: 'object',
    required: ['contractId'],
    properties: {
      contractId: {
        type: 'string',
        pattern: objectIdPattern,
        description: 'Contract ID',
      },
    },
  },
  body: {
    type: 'object',
    properties: {
      reason: {
        type: 'string',
        minLength: 10,
        description: 'Pause reason (min 10 characters)',
      },
    },
  },
} as const;

/**
 * Resume Contract Schema
 */
export const hubResumeContractSchema = {
  params: {
    type: 'object',
    required: ['contractId'],
    properties: {
      contractId: {
        type: 'string',
        pattern: objectIdPattern,
        description: 'Contract ID',
      },
    },
  },
} as const;

/**
 * Complete Contract Schema
 * Only the client can complete a contract
 */
export const hubCompleteContractSchema = {
  params: {
    type: 'object',
    required: ['contractId'],
    properties: {
      contractId: {
        type: 'string',
        pattern: objectIdPattern,
        description: 'Contract ID',
      },
    },
  },
  body: {
    type: 'object',
    properties: {
      reason: {
        type: 'string',
        maxLength: 500,
        description: 'Optional completion reason/notes',
      },
    },
  },
} as const;

/**
 * Request Terms Update Schema (for hourly contracts)
 * Note: Date preprocessing handled in controller
 */
export const hubRequestTermsUpdateSchema = {
  params: {
    type: 'object',
    required: ['contractId'],
    properties: {
      contractId: {
        type: 'string',
        pattern: objectIdPattern,
        description: 'Contract ID',
      },
    },
  },
  body: {
    type: 'object',
    required: ['weeklyLimit', 'hourlyRate', 'effectiveDate'],
    properties: {
      weeklyLimit: {
        type: 'number',
        minimum: 1,
        maximum: 168,
        description: 'New weekly hour limit',
      },
      hourlyRate: {
        type: 'number',
        minimum: 0,
        description: 'New hourly rate',
      },
      effectiveDate: {
        type: 'string',
        format: 'date-time',
        description: 'Effective date (ISO 8601, will be converted to Date in controller)',
      },
    },
  },
} as const;

/**
 * Apply Terms Update Schema
 */
export const hubApplyTermsUpdateSchema = {
  params: {
    type: 'object',
    required: ['contractId'],
    properties: {
      contractId: {
        type: 'string',
        pattern: objectIdPattern,
        description: 'Contract ID',
      },
    },
  },
} as const;

/**
 * TypeScript type definitions
 */
export interface PendingTermsUpdate {
  weeklyLimit: number;
  hourlyRate: number;
  requestedDate?: string; // Will be converted to Date in controller
  effectiveDate: string; // Will be converted to Date in controller
  requestedBy: string;
  status?: TermsUpdateStatus;
}

export interface HubCreateContractInput {
  jobId: string;
  jobProposalId: string;
  clientHubId: string; // Hub that posted the job (employer)
  expertHubId?: string; // Hub the expert belongs to (auto-filled from membership)
  contractTitle: string;
  contractDescription: string;
  contractUploads?: string[];
  priceType: PriceType;
  proposedPrice?: number; // Required if priceType is FIXED
  hasMilestones?: boolean;
  hourlyProposedPrice?: number; // Required if priceType is HOURLY
  weeklyLimit?: number;
  startDate: string; // Will be converted to Date in controller
  selectedCurrency?: string; // Will be converted to uppercase in controller
  asssignedExpertId: string;
  stripeCustomerId?: string;
  stripeAccount?: string;
  paymentMethodId?: string;
}

export interface HubUpdateContractInput {
  status?: ContractStatus;
  contractTitle?: string;
  contractDescription?: string;
  contractUploads?: string[];
  endDate?: string; // Will be converted to Date in controller
  pendingTermsUpdate?: PendingTermsUpdate;
  weeklyLimit?: number;
  hourlyProposedPrice?: number;
}

export interface HubGetContractParams {
  contractId: string;
}

export interface HubGetContractsQuery {
  clientHubId?: string; // Hub that posted the job (employer)
  expertHubId?: string; // Hub the expert belongs to
  asssignedExpertId?: string;
  createdBy?: string;
  jobId?: string;
  status?: ContractStatus;
  priceType?: PriceType;
  page?: number;
  limit?: number;
}

export interface HubCancelContractParams {
  contractId: string;
}

export interface HubCancelContractInput {
  reason?: string;
}

export interface HubPauseContractParams {
  contractId: string;
}

export interface HubPauseContractInput {
  reason?: string;
}

export interface HubResumeContractParams {
  contractId: string;
}

export interface HubCompleteContractParams {
  contractId: string;
}

export interface HubCompleteContractInput {
  reason?: string;
}

export interface HubRequestTermsUpdateParams {
  contractId: string;
}

export interface HubRequestTermsUpdateInput {
  weeklyLimit: number;
  hourlyRate: number;
  effectiveDate: string; // Will be converted to Date in controller
}

export interface HubApplyTermsUpdateParams {
  contractId: string;
}

/**
 * Hub List Contracts Schema (hub-scoped route)
 * For /hub/:hubId/contracts
 *
 * Default behavior: Returns contracts where hubId is the CLIENT (employer)
 * With expertHubId param: Returns contracts where expertHubId matches (expert perspective)
 */
export const hubListContractsSchema = {
  params: {
    type: 'object',
    required: ['hubId'],
    properties: {
      hubId: {
        type: 'string',
        pattern: objectIdPattern,
        description: 'Hub ID',
      },
    },
  },
  querystring: {
    type: 'object',
    properties: {
      expertHubId: {
        type: 'string',
        pattern: objectIdPattern,
        description:
          'Expert Hub ID - when provided, returns contracts where experts from this hub are assigned (expert perspective)',
      },
      asssignedExpertId: {
        type: 'string',
        pattern: objectIdPattern,
        description: 'Assigned expert ID filter',
      },
      createdBy: {
        type: 'string',
        pattern: objectIdPattern,
        description: 'Created by user ID filter',
      },
      jobId: {
        type: 'string',
        pattern: objectIdPattern,
        description: 'Job ID filter',
      },
      status: {
        type: 'string',
        enum: Object.values(ContractStatus),
        description: 'Status filter',
      },
      priceType: {
        type: 'string',
        enum: Object.values(PriceType),
        description: 'Price type filter',
      },
      page: {
        type: 'number',
        minimum: 1,
        description: 'Page number',
      },
      limit: {
        type: 'number',
        minimum: 1,
        maximum: 100,
        description: 'Items per page',
      },
    },
  },
} as const;

export interface HubListContractsParams {
  hubId: string;
}

export interface HubListContractsQuery {
  expertHubId?: string; // Expert perspective - contracts where hub's experts are assigned
  asssignedExpertId?: string;
  createdBy?: string;
  jobId?: string;
  status?: ContractStatus;
  priceType?: PriceType;
  page?: number;
  limit?: number;
}

// ============================================================
// Offer-Related Schemas (Contract Offer Flow)
// ============================================================

/**
 * Milestone input for Send Offer (fixed price contracts with milestones)
 */
const offerMilestoneSchema = {
  type: 'object',
  required: ['taskName', 'amount', 'dueDate'],
  properties: {
    taskName: {
      type: 'string',
      minLength: 1,
      maxLength: 150,
      description: 'Milestone task name',
    },
    taskDescription: {
      type: 'string',
      maxLength: 200,
      description: 'Milestone task description',
    },
    amount: {
      type: 'number',
      minimum: 0,
      description: 'Milestone amount',
    },
    dueDate: {
      type: 'string',
      format: 'date-time',
      description: 'Milestone due date (ISO 8601)',
    },
    order: {
      type: 'number',
      minimum: 0,
      description: 'Display order',
    },
  },
} as const;

/**
 * Send Offer Schema
 * Creates a contract in PENDING status with optional milestones
 * For fixed price contracts with milestones, milestones are created but NOT funded at this stage
 */
export const hubSendOfferSchema = {
  body: {
    type: 'object',
    required: [
      'jobId',
      'jobProposalId',
      'clientHubId',
      'contractTitle',
      'contractDescription',
      'priceType',
      'startDate',
      'asssignedExpertId',
      'selectedCurrency',
    ],
    properties: {
      jobId: {
        type: 'string',
        pattern: objectIdPattern,
        description: 'Job ID',
      },
      jobProposalId: {
        type: 'string',
        pattern: objectIdPattern,
        description: 'Proposal ID',
      },
      clientHubId: {
        type: 'string',
        pattern: objectIdPattern,
        description: 'Client Hub ID (employer/job poster)',
      },
      expertHubId: {
        type: 'string',
        pattern: objectIdPattern,
        description: 'Expert Hub ID (auto-filled from expert membership if not provided)',
      },
      contractTitle: {
        type: 'string',
        minLength: 1,
        maxLength: 70,
        description: 'Contract title',
      },
      contractDescription: {
        type: 'string',
        minLength: 20,
        maxLength: 5000,
        description: 'Contract description',
      },
      contractUploads: {
        type: 'array',
        items: { type: 'string', format: 'uri' },
        default: [],
        description: 'Contract file URLs',
      },
      priceType: {
        type: 'string',
        enum: Object.values(PriceType),
        description: 'Price type (fixed or hourly)',
      },
      // Fixed price fields
      proposedPrice: {
        type: 'number',
        minimum: 0,
        description: 'Total proposed price (required for fixed price)',
      },
      hasMilestones: {
        type: 'boolean',
        default: false,
        description: 'Whether contract has milestones (fixed price only)',
      },
      milestones: {
        type: 'array',
        items: offerMilestoneSchema,
        description: 'Milestones (required if hasMilestones is true)',
      },
      // Hourly fields
      hourlyProposedPrice: {
        type: 'number',
        minimum: 0,
        description: 'Hourly rate (required for hourly)',
      },
      weeklyLimit: {
        type: 'number',
        minimum: 1,
        maximum: 168,
        description: 'Weekly hour limit (for hourly contracts)',
      },
      // Common fields
      startDate: {
        type: 'string',
        format: 'date-time',
        description: 'Contract start date (ISO 8601)',
      },
      selectedCurrency: {
        type: 'string',
        minLength: 3,
        maxLength: 3,
        default: 'USD',
        description: 'Currency code (e.g., USD)',
      },
      asssignedExpertId: {
        type: 'string',
        pattern: objectIdPattern,
        description: 'Assigned expert user ID',
      },
      // Stripe payment fields (for client)
      stripeCustomerId: {
        type: 'string',
        description: 'Stripe customer ID (client)',
      },
      paymentMethodId: {
        type: 'string',
        description: 'Stripe payment method ID',
      },
      // Optional message
      offerMessage: {
        type: 'string',
        maxLength: 2000,
        description: 'Optional message to expert with the offer',
      },
    },
  },
} as const;

/**
 * Accept Offer Schema
 * Expert accepts the offer - requires payout setup validation
 */
export const hubAcceptOfferSchema = {
  params: {
    type: 'object',
    required: ['contractId'],
    properties: {
      contractId: {
        type: 'string',
        pattern: objectIdPattern,
        description: 'Contract ID (offer to accept)',
      },
    },
  },
  body: {
    type: 'object',
    properties: {
      acceptMessage: {
        type: 'string',
        maxLength: 1000,
        description: 'Optional acceptance message',
      },
    },
  },
} as const;

/**
 * Decline Offer Schema
 * Expert declines the offer - refunds any funded milestones
 */
export const hubDeclineOfferSchema = {
  params: {
    type: 'object',
    required: ['contractId'],
    properties: {
      contractId: {
        type: 'string',
        pattern: objectIdPattern,
        description: 'Contract ID (offer to decline)',
      },
    },
  },
  body: {
    type: 'object',
    required: ['declineReason'],
    properties: {
      declineReason: {
        type: 'string',
        minLength: 10,
        maxLength: 1000,
        description: 'Reason for declining the offer (min 10 characters)',
      },
    },
  },
} as const;

/**
 * Get Pending Offers Schema (for expert)
 * Returns contracts with PENDING status assigned to this expert
 */
export const hubGetPendingOffersSchema = {
  querystring: {
    type: 'object',
    properties: {
      expertId: {
        type: 'string',
        pattern: objectIdPattern,
        description: 'Expert user ID (defaults to current user)',
      },
      page: {
        type: 'number',
        minimum: 1,
        description: 'Page number',
      },
      limit: {
        type: 'number',
        minimum: 1,
        maximum: 100,
        description: 'Items per page',
      },
    },
  },
} as const;

// ============================================================
// Offer TypeScript Interfaces
// ============================================================

/**
 * Milestone input for send offer
 */
export interface HubOfferMilestoneInput {
  taskName: string;
  taskDescription?: string;
  amount: number;
  dueDate: string; // ISO 8601, converted to Date in service
  order?: number;
}

/**
 * Send offer input
 */
export interface HubSendOfferInput {
  jobId: string;
  jobProposalId: string;
  clientHubId: string;
  expertHubId?: string;
  contractTitle: string;
  contractDescription: string;
  contractUploads?: string[];
  priceType: PriceType;
  // Fixed price
  proposedPrice?: number;
  hasMilestones?: boolean;
  milestones?: HubOfferMilestoneInput[];
  // Hourly
  hourlyProposedPrice?: number;
  weeklyLimit?: number;
  // Common
  startDate: string;
  selectedCurrency: string;
  asssignedExpertId: string;
  stripeCustomerId?: string;
  paymentMethodId?: string;
  offerMessage?: string;
}

/**
 * Accept offer params
 */
export interface HubAcceptOfferParams {
  contractId: string;
}

/**
 * Accept offer input
 */
export interface HubAcceptOfferInput {
  acceptMessage?: string;
}

/**
 * Decline offer params
 */
export interface HubDeclineOfferParams {
  contractId: string;
}

/**
 * Decline offer input
 */
export interface HubDeclineOfferInput {
  declineReason: string;
}

/**
 * Get pending offers query
 */
export interface HubGetPendingOffersQuery {
  expertId?: string;
  page?: number;
  limit?: number;
}

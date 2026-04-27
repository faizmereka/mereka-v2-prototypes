import { PriceType, ProposalStatus } from '@core/models/JobProposal';

/**
 * Hub proposal schemas - Native JSON Schema
 * Note: Date preprocessing, currency uppercase transform, and refine validations handled in controller
 */

const objectIdPattern = '^[0-9a-fA-F]{24}$';

/**
 * Milestone sub-schema for proposal creation
 * Note: dueDate preprocessing handled in controller
 */
const milestoneSchema = {
  type: 'object',
  required: ['taskName', 'amount', 'dueDate'],
  properties: {
    taskName: {
      type: 'string',
      minLength: 1,
      maxLength: 150,
      description: 'Task name',
    },
    taskDescription: {
      type: 'string',
      maxLength: 200,
      description: 'Task description',
    },
    amount: {
      type: 'number',
      minimum: 0,
      description: 'Milestone amount (must be positive)',
    },
    dueDate: {
      type: 'string',
      format: 'date-time',
      description: 'Due date (ISO 8601, will be converted to Date in controller)',
    },
  },
} as const;

/**
 * Create Proposal Schema
 * Note: Refine validations (conditional requirements based on priceType) handled in controller
 */
export const hubCreateProposalSchema = {
  body: {
    type: 'object',
    required: ['jobId', 'proposalDetails', 'priceType'],
    properties: {
      jobId: {
        type: 'string',
        pattern: objectIdPattern,
        description: 'Job ID',
      },
      proposalDetails: {
        type: 'string',
        minLength: 10,
        maxLength: 2000,
        description: 'Proposal details',
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
      hourlyProposedPrice: {
        type: 'number',
        minimum: 0,
        description: 'Hourly rate (required for hourly)',
      },
      workingHours: {
        type: 'number',
        minimum: 0,
        description: 'Working hours (required for hourly)',
      },
      selectedCurrency: {
        type: 'string',
        minLength: 3,
        maxLength: 3,
        default: 'MYR',
        description: 'Currency code (3 characters, will be converted to uppercase)',
      },
      files: {
        type: 'array',
        items: {
          type: 'string',
          format: 'uri',
        },
        default: [],
        description: 'Proposal file URLs',
      },
      asssignedExpertId: {
        type: 'string',
        pattern: objectIdPattern,
        description: 'Assigned expert ID (optional, will use auth user ID if not provided)',
      },
      milestones: {
        type: 'array',
        items: milestoneSchema,
        default: [],
        description: 'Optional milestones for fixed price',
      },
    },
  },
} as const;

/**
 * Update Proposal Schema
 */
export const hubUpdateProposalSchema = {
  params: {
    type: 'object',
    required: ['proposalId'],
    properties: {
      proposalId: {
        type: 'string',
        pattern: objectIdPattern,
        description: 'Proposal ID',
      },
    },
  },
  body: {
    type: 'object',
    properties: {
      status: {
        type: 'string',
        enum: Object.values(ProposalStatus),
        description: 'Proposal status',
      },
      contractId: {
        type: 'string',
        pattern: objectIdPattern,
        description: 'Contract ID',
      },
      isReviewFromClient: {
        type: 'boolean',
        description: 'Review from client',
      },
      isReviewFromExpert: {
        type: 'boolean',
        description: 'Review from expert',
      },
    },
  },
} as const;

/**
 * Get Proposal by ID Schema (standalone route)
 */
export const hubGetProposalSchema = {
  params: {
    type: 'object',
    required: ['proposalId'],
    properties: {
      proposalId: {
        type: 'string',
        pattern: objectIdPattern,
        description: 'Proposal ID',
      },
    },
  },
} as const;

/**
 * Get Proposal by ID Schema (hub-scoped route)
 * Used for: /hub/:hubId/proposals/:proposalId
 */
export const hubScopedGetProposalSchema = {
  params: {
    type: 'object',
    required: ['hubId', 'proposalId'],
    properties: {
      hubId: {
        type: 'string',
        pattern: objectIdPattern,
        description: 'Hub ID',
      },
      proposalId: {
        type: 'string',
        pattern: objectIdPattern,
        description: 'Proposal ID',
      },
    },
  },
} as const;

/**
 * Get Proposals (Query) Schema
 * Note: Number preprocessing and refine validation (at least one filter) handled in controller
 */
export const hubGetProposalsSchema = {
  querystring: {
    type: 'object',
    properties: {
      jobId: {
        type: 'string',
        pattern: objectIdPattern,
        description: 'Job ID filter',
      },
      createdBy: {
        type: 'string',
        pattern: objectIdPattern,
        description: 'Created by user ID filter',
      },
      asssignedExpertId: {
        type: 'string',
        pattern: objectIdPattern,
        description: 'Assigned expert ID filter',
      },
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
      status: {
        type: 'string',
        enum: Object.values(ProposalStatus),
        description: 'Status filter',
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
 * List Proposals for Hub Schema (hubId from path params)
 * Used for scoped hub routes: /hub/:hubId/proposals
 *
 * Default behavior: Returns proposals where hubId is the CLIENT (job poster/employer)
 * With expertHubId param: Returns proposals submitted by experts from this hub (expert perspective)
 */
export const hubListProposalsSchema = {
  params: {
    type: 'object',
    required: ['hubId'],
    properties: {
      hubId: {
        type: 'string',
        pattern: objectIdPattern,
        description: 'Hub ID from path',
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
          'Expert Hub ID - when provided, returns proposals submitted by experts from this hub (expert perspective)',
      },
      jobId: {
        type: 'string',
        pattern: objectIdPattern,
        description: 'Job ID filter',
      },
      status: {
        type: 'string',
        enum: Object.values(ProposalStatus),
        description: 'Status filter',
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
 * Withdraw Proposal Schema
 */
export const hubWithdrawProposalSchema = {
  params: {
    type: 'object',
    required: ['proposalId'],
    properties: {
      proposalId: {
        type: 'string',
        pattern: objectIdPattern,
        description: 'Proposal ID',
      },
    },
  },
} as const;

/**
 * Reject Proposal Schema
 */
export const hubRejectProposalSchema = {
  params: {
    type: 'object',
    required: ['proposalId'],
    properties: {
      proposalId: {
        type: 'string',
        pattern: objectIdPattern,
        description: 'Proposal ID',
      },
    },
  },
} as const;

/**
 * TypeScript type definitions
 */
export interface HubMilestoneInput {
  taskName: string;
  taskDescription?: string;
  amount: number;
  dueDate: string; // Will be converted to Date in controller
}

export interface HubCreateProposalInput {
  jobId: string;
  proposalDetails: string;
  priceType: PriceType;
  proposedPrice?: number; // Required if priceType is FIXED
  hourlyProposedPrice?: number; // Required if priceType is HOURLY
  workingHours?: number; // Required if priceType is HOURLY
  selectedCurrency?: string; // Will be converted to uppercase in controller
  files?: string[];
  asssignedExpertId?: string;
  milestones?: HubMilestoneInput[]; // Total must not exceed proposedPrice if provided
}

export interface HubUpdateProposalInput {
  status?: ProposalStatus;
  contractId?: string;
  isReviewFromClient?: boolean;
  isReviewFromExpert?: boolean;
}

export interface HubGetProposalParams {
  proposalId: string;
}

export interface HubGetProposalsQuery {
  jobId?: string;
  createdBy?: string;
  asssignedExpertId?: string;
  clientHubId?: string; // Hub that posted the job (employer)
  expertHubId?: string; // Hub the expert belongs to
  status?: ProposalStatus;
  page?: number;
  limit?: number;
}

export interface HubWithdrawProposalParams {
  proposalId: string;
}

export interface HubRejectProposalParams {
  proposalId: string;
}

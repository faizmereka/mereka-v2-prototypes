/**
 * Checkout Proposal Schemas - Native JSON Schema
 * Used by checkout.mereka.io for proposal submission
 */

import { PriceType } from '@core/models/JobProposal';

const objectIdPattern = '^[0-9a-fA-F]{24}$';

// ============================================================================
// Response Types
// ============================================================================

/**
 * Job summary for checkout initialization
 */
export interface CheckoutJobSummary {
  _id: string;
  jobTitle: string;
  jobDescription: string;
  jobSummary?: string;
  employmentType: string;
  serviceCategory: {
    category: string;
    serviceType: string;
  };
  expertLevel?: string;
  jobLocation?: string;
  jobBudget: {
    pricingType: 'fixed' | 'hourly';
    fromAmount: number;
    upToAmount?: number;
  };
  jobCurrency: string;
  jobSkills: string[];
  client: {
    name: string;
    organizationName?: string;
    organizationImage?: string;
  };
}

/**
 * Expert info for checkout
 */
export interface CheckoutExpertInfo {
  _id: string;
  name: string;
  email: string;
  profilePhoto?: string;
  professionalTitle?: string;
}

/**
 * Hub expert for selection dropdown
 */
export interface HubExpert {
  _id: string;
  name: string;
  email: string;
  profileImage?: string;
}

/**
 * Response for GET /checkout/proposal/:jobId
 */
export interface CheckoutProposalInitResponse {
  job: CheckoutJobSummary;
  expert: CheckoutExpertInfo;
  hubExperts: HubExpert[]; // List of experts from user's hub for selection
  hubPlan?: string; // Hub subscription plan (starter = only self, others = dropdown)
  hasExistingProposal: boolean;
  existingProposalId?: string;
}

// ============================================================================
// Request Types
// ============================================================================

/**
 * Milestone input for proposal submission
 */
export interface CheckoutMilestoneInput {
  taskName: string;
  taskDescription?: string;
  amount: number;
  dueDate: string; // ISO date string
}

/**
 * Request body for POST /checkout/proposal
 */
export interface SubmitProposalInput {
  jobId: string;
  asssignedExpertId?: string; // Expert to assign (from hubExperts list). Defaults to current user
  proposalDetails: string; // Cover letter, max 2000 chars
  priceType: 'fixed' | 'hourly';
  proposedPrice?: number; // Required for fixed
  hourlyProposedPrice?: number; // Required for hourly
  workingHours?: number; // Required for hourly
  selectedCurrency: string;
  files?: string[];
  milestones?: CheckoutMilestoneInput[];
}

/**
 * Response for POST /checkout/proposal
 */
export interface SubmitProposalResponse {
  proposalId: string;
  status: string;
}

// ============================================================================
// JSON Schemas
// ============================================================================

/**
 * Schema for GET /checkout/proposal/:jobId
 */
export const checkoutProposalInitSchema = {
  params: {
    type: 'object',
    required: ['jobId'],
    properties: {
      jobId: {
        type: 'string',
        pattern: objectIdPattern,
        description: 'Job ID to create proposal for',
      },
    },
  },
} as const;

/**
 * Milestone sub-schema for proposal submission
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
      description: 'Due date (ISO 8601)',
    },
  },
} as const;

/**
 * Schema for POST /checkout/proposal
 */
export const submitProposalSchema = {
  body: {
    type: 'object',
    required: ['jobId', 'proposalDetails', 'priceType', 'selectedCurrency'],
    properties: {
      jobId: {
        type: 'string',
        pattern: objectIdPattern,
        description: 'Job ID',
      },
      asssignedExpertId: {
        type: 'string',
        pattern: objectIdPattern,
        description: 'Expert ID to assign the proposal to (defaults to current user)',
      },
      proposalDetails: {
        type: 'string',
        minLength: 10,
        maxLength: 2000,
        description: 'Cover letter / proposal details',
      },
      priceType: {
        type: 'string',
        enum: Object.values(PriceType),
        description: 'Price type (fixed or hourly)',
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
        minimum: 1,
        description: 'Estimated working hours (required for hourly)',
      },
      selectedCurrency: {
        type: 'string',
        minLength: 3,
        maxLength: 3,
        description: 'Currency code (3 characters, e.g., MYR, USD)',
      },
      files: {
        type: 'array',
        items: {
          type: 'string',
        },
        default: [],
        description: 'Uploaded file URLs',
      },
      milestones: {
        type: 'array',
        items: milestoneSchema,
        default: [],
        description: 'Optional milestones for fixed price proposals',
      },
    },
  },
} as const;

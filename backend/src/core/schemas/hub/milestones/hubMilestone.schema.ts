import { MilestoneStatus } from '@core/models/Milestone';

/**
 * Hub milestone schemas - Native JSON Schema
 * Note: Date preprocessing, currency uppercase transform, and refine validations handled in controller
 */

const objectIdPattern = '^[0-9a-fA-F]{24}$';

/**
 * Create Milestone Schema
 * Note: dueDate preprocessing and currency uppercase handled in controller
 */
export const hubCreateMilestoneSchema = {
  body: {
    type: 'object',
    required: ['jobId', 'jobProposalId', 'hubId', 'taskName', 'amount', 'dueDate'],
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
      hubId: {
        type: 'string',
        pattern: objectIdPattern,
        description: 'Hub ID',
      },
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
      currency: {
        type: 'string',
        minLength: 3,
        maxLength: 3,
        default: 'MYR',
        description: 'Currency code (3 characters, will be converted to uppercase)',
      },
      status: {
        type: 'string',
        enum: Object.values(MilestoneStatus),
        default: MilestoneStatus.FUNDED,
        description: 'Milestone status',
      },
      contractId: {
        type: 'string',
        pattern: objectIdPattern,
        description: 'Contract ID',
      },
    },
  },
} as const;

/**
 * Create Multiple Milestones Schema (Bulk)
 */
export const hubCreateMultipleMilestonesSchema = {
  body: {
    type: 'object',
    required: ['milestones'],
    properties: {
      milestones: {
        type: 'array',
        items: {
          type: 'object',
          required: ['jobId', 'jobProposalId', 'hubId', 'taskName', 'amount', 'dueDate'],
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
            hubId: {
              type: 'string',
              pattern: objectIdPattern,
              description: 'Hub ID',
            },
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
              description: 'Milestone amount',
            },
            dueDate: {
              type: 'string',
              format: 'date-time',
              description: 'Due date (ISO 8601)',
            },
            currency: {
              type: 'string',
              minLength: 3,
              maxLength: 3,
              default: 'MYR',
              description: 'Currency code',
            },
            contractId: {
              type: 'string',
              pattern: objectIdPattern,
              description: 'Contract ID',
            },
          },
        },
        minItems: 1,
        description: 'Array of milestones (at least one required)',
      },
    },
  },
} as const;

/**
 * Update Milestone Schema
 * Note: Date preprocessing handled in controller
 */
export const hubUpdateMilestoneSchema = {
  params: {
    type: 'object',
    required: ['milestoneId'],
    properties: {
      milestoneId: {
        type: 'string',
        pattern: objectIdPattern,
        description: 'Milestone ID',
      },
    },
  },
  body: {
    type: 'object',
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
        description: 'Milestone amount',
      },
      dueDate: {
        type: 'string',
        format: 'date-time',
        description: 'Due date (ISO 8601)',
      },
      status: {
        type: 'string',
        enum: Object.values(MilestoneStatus),
        description: 'Milestone status',
      },
      workLogDescription: {
        type: 'string',
        description: 'Work log description',
      },
      workLogFilesUrl: {
        type: 'array',
        items: {
          type: 'string',
          format: 'uri',
        },
        description: 'Work log file URLs',
      },
      workSubmittedDate: {
        type: 'string',
        format: 'date-time',
        description: 'Work submitted date (ISO 8601)',
      },
      paymentIntentId: {
        type: 'string',
        description: 'Payment intent ID',
      },
      contractId: {
        type: 'string',
        pattern: objectIdPattern,
        description: 'Contract ID',
      },
    },
  },
} as const;

/**
 * Update Milestone with Change Tracking Schema
 */
export const hubUpdateMilestoneWithTrackingSchema = {
  params: {
    type: 'object',
    required: ['milestoneId'],
    properties: {
      milestoneId: {
        type: 'string',
        pattern: objectIdPattern,
        description: 'Milestone ID',
      },
    },
  },
  body: {
    type: 'object',
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
        description: 'Milestone amount',
      },
      dueDate: {
        type: 'string',
        format: 'date-time',
        description: 'Due date (ISO 8601)',
      },
      workLogDescription: {
        type: 'string',
        description: 'Work log description',
      },
      changeReason: {
        type: 'string',
        maxLength: 500,
        description: 'Reason for change',
      },
    },
  },
} as const;

/**
 * Get Milestone by ID Schema
 */
export const hubGetMilestoneSchema = {
  params: {
    type: 'object',
    required: ['milestoneId'],
    properties: {
      milestoneId: {
        type: 'string',
        pattern: objectIdPattern,
        description: 'Milestone ID',
      },
    },
  },
} as const;

/**
 * Get Milestones (Query) Schema
 * Note: Number preprocessing and refine validation (at least one filter) handled in controller
 */
export const hubGetMilestonesSchema = {
  querystring: {
    type: 'object',
    properties: {
      jobProposalId: {
        type: 'string',
        pattern: objectIdPattern,
        description: 'Proposal ID filter',
      },
      contractId: {
        type: 'string',
        pattern: objectIdPattern,
        description: 'Contract ID filter',
      },
      jobId: {
        type: 'string',
        pattern: objectIdPattern,
        description: 'Job ID filter',
      },
      status: {
        type: 'string',
        enum: Object.values(MilestoneStatus),
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
 * Delete Milestone Schema
 */
export const hubDeleteMilestoneSchema = {
  params: {
    type: 'object',
    required: ['milestoneId'],
    properties: {
      milestoneId: {
        type: 'string',
        pattern: objectIdPattern,
        description: 'Milestone ID',
      },
    },
  },
} as const;

/**
 * Submit Work for Milestone Schema
 */
export const hubSubmitWorkSchema = {
  params: {
    type: 'object',
    required: ['milestoneId'],
    properties: {
      milestoneId: {
        type: 'string',
        pattern: objectIdPattern,
        description: 'Milestone ID',
      },
    },
  },
  body: {
    type: 'object',
    required: ['workLogDescription'],
    properties: {
      workLogDescription: {
        type: 'string',
        minLength: 10,
        description: 'Work description (min 10 characters)',
      },
      workLogFilesUrl: {
        type: 'array',
        items: {
          type: 'string',
          format: 'uri',
        },
        minItems: 0,
        default: [],
        description: 'Work log file URLs',
      },
    },
  },
} as const;

/**
 * Approve Milestone Work Schema
 */
export const hubApproveMilestoneSchema = {
  params: {
    type: 'object',
    required: ['milestoneId'],
    properties: {
      milestoneId: {
        type: 'string',
        pattern: objectIdPattern,
        description: 'Milestone ID',
      },
    },
  },
  body: {
    type: 'object',
    properties: {
      paymentIntentId: {
        type: 'string',
        description: 'Stripe payment intent ID',
      },
    },
  },
} as const;

/**
 * Get Upcoming Milestones Schema
 * Note: Number preprocessing handled in controller
 */
export const hubGetUpcomingMilestonesSchema = {
  querystring: {
    type: 'object',
    required: ['jobProposalId'],
    properties: {
      jobProposalId: {
        type: 'string',
        pattern: objectIdPattern,
        description: 'Proposal ID',
      },
      daysAhead: {
        type: 'number',
        minimum: 1,
        default: 7,
        description: 'Days ahead to look',
      },
    },
  },
} as const;

/**
 * Get Overdue Milestones Schema
 */
export const hubGetOverdueMilestonesSchema = {
  querystring: {
    type: 'object',
    required: ['jobProposalId'],
    properties: {
      jobProposalId: {
        type: 'string',
        pattern: objectIdPattern,
        description: 'Proposal ID',
      },
    },
  },
} as const;

/**
 * Payment Processing Schemas
 */

/**
 * Fund Milestones Schema
 */
export const hubFundMilestonesSchema = {
  body: {
    type: 'object',
    required: ['milestoneIds', 'customerId', 'paymentMethodId'],
    properties: {
      milestoneIds: {
        type: 'array',
        items: {
          type: 'string',
          pattern: objectIdPattern,
        },
        minItems: 1,
        description: 'Array of milestone IDs (at least one required)',
      },
      customerId: {
        type: 'string',
        minLength: 1,
        description: 'Customer ID',
      },
      paymentMethodId: {
        type: 'string',
        minLength: 1,
        description: 'Payment method ID',
      },
      currency: {
        type: 'string',
        minLength: 3,
        maxLength: 3,
        default: 'USD',
        description: 'Currency code',
      },
    },
  },
} as const;

/**
 * Release Payment Schema
 */
export const hubReleasePaymentSchema = {
  body: {
    type: 'object',
    required: ['milestoneIds'],
    properties: {
      milestoneIds: {
        type: 'array',
        items: {
          type: 'string',
          pattern: objectIdPattern,
        },
        minItems: 1,
        description: 'Array of milestone IDs (at least one required)',
      },
    },
  },
} as const;

/**
 * Refund Milestones Schema
 */
export const hubRefundMilestonesSchema = {
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
export interface HubCreateMilestoneInput {
  jobId: string;
  jobProposalId: string;
  hubId: string;
  taskName: string;
  taskDescription?: string;
  amount: number;
  dueDate: string; // Will be converted to Date in controller
  currency?: string; // Will be converted to uppercase in controller
  status?: MilestoneStatus;
  contractId?: string;
}

export interface HubCreateMultipleMilestonesInput {
  milestones: Array<{
    jobId: string;
    jobProposalId: string;
    hubId: string;
    taskName: string;
    taskDescription?: string;
    amount: number;
    dueDate: string;
    currency?: string;
    contractId?: string;
  }>;
}

export interface HubUpdateMilestoneInput {
  taskName?: string;
  taskDescription?: string;
  amount?: number;
  dueDate?: string; // Will be converted to Date in controller
  status?: MilestoneStatus;
  workLogDescription?: string;
  workLogFilesUrl?: string[];
  workSubmittedDate?: string; // Will be converted to Date in controller
  paymentIntentId?: string;
  contractId?: string;
}

export interface HubUpdateMilestoneWithTrackingInput {
  taskName?: string;
  taskDescription?: string;
  amount?: number;
  dueDate?: string; // Will be converted to Date in controller
  workLogDescription?: string;
  changeReason?: string;
}

export interface HubGetMilestoneParams {
  milestoneId: string;
}

export interface HubGetMilestonesQuery {
  jobProposalId?: string;
  contractId?: string;
  jobId?: string;
  status?: MilestoneStatus;
  page?: number;
  limit?: number;
}

export interface HubDeleteMilestoneParams {
  milestoneId: string;
}

export interface HubSubmitWorkInput {
  workLogDescription: string;
  workLogFilesUrl?: string[];
}

export interface HubSubmitWorkParams {
  milestoneId: string;
}

export interface HubApproveMilestoneInput {
  paymentIntentId?: string;
}

export interface HubApproveMilestoneParams {
  milestoneId: string;
}

export interface HubGetUpcomingMilestonesQuery {
  jobProposalId: string;
  daysAhead?: number;
}

export interface HubGetOverdueMilestonesQuery {
  jobProposalId: string;
}

export interface HubFundMilestonesInput {
  milestoneIds: string[];
  customerId: string;
  paymentMethodId: string;
  currency?: string;
}

export interface HubReleasePaymentInput {
  milestoneIds: string[];
}

export interface HubRefundMilestonesParams {
  contractId: string;
}

import { TimelogStatus } from '@core/models/TimelogEntry';

/**
 * Hub timelog schemas - Native JSON Schema
 * Note: Date/number preprocessing and refine validations handled in controller
 */

const objectIdPattern = '^[0-9a-fA-F]{24}$';
const timePattern = '^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$';

/**
 * Create Timelog Entry Schema
 * Note: workDate preprocessing (string/Date conversion) handled in controller
 */
export const hubCreateTimelogSchema = {
  body: {
    type: 'object',
    required: ['contractId', 'workDate', 'startTime', 'endTime', 'description'],
    properties: {
      contractId: {
        type: 'string',
        pattern: objectIdPattern,
        description: 'Contract ID',
      },
      workDate: {
        type: 'string',
        description: 'Work date (YYYY-MM-DD format)',
      },
      startTime: {
        type: 'string',
        pattern: timePattern,
        description: 'Start time (HH:MM format)',
      },
      endTime: {
        type: 'string',
        pattern: timePattern,
        description: 'End time (HH:MM format)',
      },
      breakDuration: {
        type: 'number',
        minimum: 0,
        maximum: 4,
        description: 'Break duration in hours',
      },
      description: {
        type: 'string',
        minLength: 10,
        maxLength: 1000,
        description: 'Work description',
      },
      tasks: {
        type: 'array',
        items: {
          type: 'string',
        },
        maxItems: 20,
        default: [],
        description: 'List of tasks (max 20)',
      },
    },
  },
} as const;

/**
 * Update Timelog Entry Schema
 */
export const hubUpdateTimelogSchema = {
  params: {
    type: 'object',
    required: ['timelogId'],
    properties: {
      timelogId: {
        type: 'string',
        pattern: objectIdPattern,
        description: 'Timelog ID',
      },
    },
  },
  body: {
    type: 'object',
    properties: {
      startTime: {
        type: 'string',
        pattern: timePattern,
        description: 'Start time (HH:MM format)',
      },
      endTime: {
        type: 'string',
        pattern: timePattern,
        description: 'End time (HH:MM format)',
      },
      breakDuration: {
        type: 'number',
        minimum: 0,
        maximum: 4,
        description: 'Break duration in hours',
      },
      description: {
        type: 'string',
        minLength: 10,
        maxLength: 1000,
        description: 'Work description',
      },
      tasks: {
        type: 'array',
        items: {
          type: 'string',
        },
        maxItems: 20,
        description: 'List of tasks (max 20)',
      },
    },
  },
} as const;

/**
 * Get Timelog Entry Schema
 */
export const hubGetTimelogSchema = {
  params: {
    type: 'object',
    required: ['timelogId'],
    properties: {
      timelogId: {
        type: 'string',
        pattern: objectIdPattern,
        description: 'Timelog ID',
      },
    },
  },
} as const;

/**
 * Get Timelogs (Query) Schema
 * Note: Number preprocessing and refine validation (at least one filter) handled in controller
 */
export const hubGetTimelogsSchema = {
  querystring: {
    type: 'object',
    properties: {
      contractId: {
        type: 'string',
        pattern: objectIdPattern,
        description: 'Contract ID filter',
      },
      expertId: {
        type: 'string',
        pattern: objectIdPattern,
        description: 'Expert ID filter',
      },
      status: {
        type: 'string',
        enum: Object.values(TimelogStatus),
        description: 'Timelog status filter',
      },
      year: {
        type: 'number',
        minimum: 2020,
        maximum: 2100,
        description: 'Year filter',
      },
      weekNumber: {
        type: 'number',
        minimum: 1,
        maximum: 53,
        description: 'Week number filter',
      },
      monthNumber: {
        type: 'number',
        minimum: 1,
        maximum: 12,
        description: 'Month number filter',
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
 * Submit Timelog Schema
 */
export const hubSubmitTimelogSchema = {
  params: {
    type: 'object',
    required: ['timelogId'],
    properties: {
      timelogId: {
        type: 'string',
        pattern: objectIdPattern,
        description: 'Timelog ID',
      },
    },
  },
} as const;

/**
 * Approve Timelog Schema
 */
export const hubApproveTimelogSchema = {
  params: {
    type: 'object',
    required: ['timelogId'],
    properties: {
      timelogId: {
        type: 'string',
        pattern: objectIdPattern,
        description: 'Timelog ID',
      },
    },
  },
  body: {
    type: 'object',
    properties: {
      paymentIntentId: {
        type: 'string',
        description: 'Payment intent ID (optional)',
      },
    },
  },
} as const;

/**
 * Reject Timelog Schema
 */
export const hubRejectTimelogSchema = {
  params: {
    type: 'object',
    required: ['timelogId'],
    properties: {
      timelogId: {
        type: 'string',
        pattern: objectIdPattern,
        description: 'Timelog ID',
      },
    },
  },
  body: {
    type: 'object',
    required: ['reason'],
    properties: {
      reason: {
        type: 'string',
        minLength: 10,
        maxLength: 500,
        description: 'Rejection reason',
      },
    },
  },
} as const;

/**
 * Delete Timelog Schema
 */
export const hubDeleteTimelogSchema = {
  params: {
    type: 'object',
    required: ['timelogId'],
    properties: {
      timelogId: {
        type: 'string',
        pattern: objectIdPattern,
        description: 'Timelog ID',
      },
    },
  },
} as const;

/**
 * Get Weekly Summary Schema
 * Note: Number preprocessing handled in controller
 */
export const hubGetWeeklySummarySchema = {
  querystring: {
    type: 'object',
    required: ['contractId', 'year', 'weekNumber'],
    properties: {
      contractId: {
        type: 'string',
        pattern: objectIdPattern,
        description: 'Contract ID',
      },
      year: {
        type: 'number',
        minimum: 2020,
        maximum: 2100,
        description: 'Year',
      },
      weekNumber: {
        type: 'number',
        minimum: 1,
        maximum: 53,
        description: 'Week number',
      },
    },
  },
} as const;

/**
 * TypeScript type definitions
 */
export interface HubCreateTimelogInput {
  contractId: string;
  workDate: string; // Will be converted to Date in controller
  startTime: string;
  endTime: string;
  breakDuration?: number;
  description: string;
  tasks?: string[];
}

export interface HubUpdateTimelogInput {
  startTime?: string;
  endTime?: string;
  breakDuration?: number;
  description?: string;
  tasks?: string[];
}

export interface HubGetTimelogParams {
  timelogId: string;
}

export interface HubGetTimelogsQuery {
  contractId?: string;
  expertId?: string;
  status?: TimelogStatus;
  year?: number;
  weekNumber?: number;
  monthNumber?: number;
  page?: number;
  limit?: number;
}

export interface HubSubmitTimelogParams {
  timelogId: string;
}

export interface HubApproveTimelogParams {
  timelogId: string;
}

export interface HubApproveTimelogInput {
  paymentIntentId?: string;
}

export interface HubRejectTimelogParams {
  timelogId: string;
}

export interface HubRejectTimelogInput {
  reason: string;
}

export interface HubDeleteTimelogParams {
  timelogId: string;
}

export interface HubGetWeeklySummaryQuery {
  contractId: string;
  year: number;
  weekNumber: number;
}

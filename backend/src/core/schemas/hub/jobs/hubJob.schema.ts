import { AccessMode, EmploymentType, JobStatus, PricingType } from '@core/models/Job';

/**
 * Hub job schemas - Native JSON Schema
 * Note: Date preprocessing, union types, and conditional validations handled in controller
 */

const objectIdPattern = '^[0-9a-fA-F]{24}$';

// Shared job properties for reuse in schemas
const jobProperties = {
  jobTitle: {
    type: 'string',
    minLength: 5,
    maxLength: 100,
    description: 'Job title',
  },
  jobDescription: {
    type: 'string',
    minLength: 20,
    maxLength: 10000,
    description: 'Job description',
  },
  jobSummary: {
    type: 'string',
    maxLength: 500,
    description: 'Job summary',
  },
  employmentType: {
    type: 'string',
    enum: Object.values(EmploymentType),
    default: EmploymentType.FREELANCE,
    description: 'Employment type',
  },
  status: {
    type: 'string',
    enum: Object.values(JobStatus),
    default: JobStatus.DRAFT,
    description: 'Job status',
  },
  serviceCategory: {
    type: 'object',
    required: ['category', 'serviceType'],
    properties: {
      category: {
        type: 'string',
        minLength: 1,
        description: 'Service category',
      },
      serviceType: {
        type: 'string',
        minLength: 1,
        description: 'Service type',
      },
    },
    description: 'Service category',
  },
  expertLevel: {
    type: 'string',
    description: 'Expert level required',
  },
  jobLocation: {
    type: 'string',
    description: 'Job location',
  },
  preferredLocation: {
    type: 'array',
    items: {
      type: 'string',
    },
    description: 'Preferred locations',
  },
  jobBudget: {
    type: 'object',
    required: ['pricingType', 'fromAmount'],
    properties: {
      pricingType: {
        type: 'string',
        enum: Object.values(PricingType),
        description: 'Pricing type',
      },
      fromAmount: {
        type: 'number',
        minimum: 0,
        description: 'Minimum amount',
      },
      upToAmount: {
        oneOf: [
          { type: 'number', minimum: 0 },
          { type: 'string', maxLength: 0 },
        ],
        description: 'Maximum amount (number or empty string)',
      },
    },
    description: 'Job budget',
  },
  jobCurrency: {
    type: 'string',
    minLength: 3,
    maxLength: 3,
    description: 'Currency code (3 characters)',
  },
  jobStartDate: {
    type: 'string',
    description: 'Job start date (ISO 8601 or type like "asap", "flexible")',
  },
  startDateType: {
    type: 'string',
    enum: ['asap', 'flexible', 'specific'],
    description: 'Start date type',
  },
  jobEndDate: {
    type: 'string',
    description: 'Job end date (can be duration string like "<1")',
  },
  duration: {
    type: 'string',
    description: 'Job duration (e.g., "<1-month", "1-6-months", ">6-months", "ongoing")',
  },
  jobSkills: {
    type: 'array',
    items: {
      type: 'string',
    },
    description: 'Required skills (optional for drafts, minimum 3 for publishing)',
  },
  jobUploads: {
    type: 'array',
    items: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        url: { type: 'string' },
        name: { type: 'string' },
        size: { type: 'number' },
        type: { type: 'string' },
      },
    },
    description: 'Job attachment objects',
  },
  accessMode: {
    type: 'string',
    enum: Object.values(AccessMode),
    default: AccessMode.PUBLIC,
    description: 'Access mode',
  },
  name: {
    type: 'string',
    minLength: 1,
    description: 'Contact name',
  },
  email: {
    type: 'string',
    format: 'email',
    description: 'Contact email',
  },
  phoneNumber: {
    type: 'string',
    description: 'Contact phone number',
  },
  organizationName: {
    type: 'string',
    description: 'Organization name',
  },
  aboutOrganization: {
    type: 'string',
    maxLength: 2000,
    description: 'About organization',
  },
  organizationImage: {
    type: 'string',
    description: 'Organization image URL',
  },
  hubId: {
    type: 'string',
    minLength: 1,
    description: 'Hub ID',
  },
} as const;

/**
 * Create Job Schema (POST /hub/jobs)
 */
export const hubCreateJobSchema = {
  body: {
    type: 'object',
    required: [
      'jobTitle',
      'jobDescription',
      'serviceCategory',
      'jobBudget',
      'jobCurrency',
      'name',
      'email',
      'hubId',
    ],
    properties: jobProperties,
  },
} as const;

/**
 * Update Job Schema (PATCH /hub/jobs/:id)
 * All fields optional for partial updates
 */
export const hubUpdateJobSchema = {
  body: {
    type: 'object',
    properties: jobProperties,
    additionalProperties: false,
  },
} as const;

/**
 * Generate AI Summary Schema (POST /hub/jobs/generate-summary)
 */
export const hubGenerateSummarySchema = {
  body: {
    type: 'object',
    required: ['description'],
    properties: {
      description: {
        type: 'string',
        minLength: 20,
        maxLength: 10000,
        description: 'Job description to summarize',
      },
    },
  },
} as const;

/**
 * Upsert Job Schema (Create or Update) - DEPRECATED, use hubCreateJobSchema + hubUpdateJobSchema
 * Matches frontend Job interface exactly
 * Note: jobStartDate preprocessing and upToAmount union (number or empty string) handled in controller
 */
export const hubUpsertJobSchema = {
  body: {
    type: 'object',
    required: [
      'jobTitle',
      'jobDescription',
      'serviceCategory',
      'jobBudget',
      'jobCurrency',
      'jobSkills',
      'name',
      'email',
      'hubId',
    ],
    properties: {
      id: {
        type: 'string',
        pattern: objectIdPattern,
        description: 'Job ID (optional, for update)',
      },
      ...jobProperties,
    },
  },
} as const;

/**
 * Get Job Schema
 */
export const hubGetJobSchema = {
  params: {
    type: 'object',
    required: ['id'],
    properties: {
      id: {
        type: 'string',
        pattern: objectIdPattern,
        description: 'Job ID',
      },
    },
  },
} as const;

/**
 * List Jobs Schema
 * Note: Number transform for page/limit handled by Fastify coerceTypes
 */
export const hubGetJobsSchema = {
  querystring: {
    type: 'object',
    properties: {
      page: {
        type: 'number',
        minimum: 1,
        default: 1,
        description: 'Page number',
      },
      limit: {
        type: 'number',
        minimum: 1,
        default: 20,
        description: 'Items per page',
      },
      status: {
        type: 'string',
        enum: Object.values(JobStatus),
        description: 'Job status filter',
      },
      hubId: {
        type: 'string',
        description: 'Hub ID filter',
      },
      search: {
        type: 'string',
        description: 'Search query (searches in jobTitle and jobDescription)',
      },
      category: {
        type: 'string',
        description: 'Category filter',
      },
      skills: {
        type: 'string',
        description: 'Comma-separated skills (searches in jobSkills)',
      },
    },
  },
} as const;

/**
 * TypeScript type definitions
 */
export interface ServiceCategory {
  category: string;
  serviceType: string;
}

export interface JobBudget {
  pricingType: PricingType;
  fromAmount: number;
  upToAmount?: number | string; // Can be number or empty string
}

export interface JobAttachment {
  id?: string;
  url: string;
  name: string;
  size?: number;
  type?: string;
}

/** Create Job Input */
export interface HubCreateJobInput {
  jobTitle: string;
  jobDescription: string;
  jobSummary?: string;
  employmentType?: EmploymentType;
  status?: JobStatus;
  serviceCategory: ServiceCategory;
  expertLevel?: string;
  jobLocation?: string;
  preferredLocation?: string[];
  jobBudget: JobBudget;
  jobCurrency: string;
  jobStartDate?: string;
  startDateType?: 'asap' | 'flexible' | 'specific';
  jobEndDate?: string;
  duration?: string;
  jobSkills?: string[];
  jobUploads?: JobAttachment[];
  accessMode?: AccessMode;
  name: string;
  email: string;
  phoneNumber?: string;
  organizationName?: string;
  aboutOrganization?: string;
  organizationImage?: string;
  hubId: string;
}

/** Update Job Input - all fields optional */
export type HubUpdateJobInput = Partial<HubCreateJobInput>;

/** Generate AI Summary Input */
export interface HubGenerateSummaryInput {
  description: string;
}

/** @deprecated Use HubCreateJobInput + HubUpdateJobInput instead */
export interface HubUpsertJobInput {
  id?: string;
  jobTitle: string;
  jobDescription: string;
  jobSummary?: string;
  employmentType?: EmploymentType;
  status?: JobStatus;
  serviceCategory: ServiceCategory;
  expertLevel?: string;
  jobLocation?: string;
  preferredLocation?: string[];
  jobBudget: JobBudget;
  jobCurrency: string;
  jobStartDate?: string;
  jobEndDate?: string;
  jobSkills: string[];
  jobUploads?: string[];
  accessMode?: AccessMode;
  name: string;
  email: string;
  phoneNumber?: string;
  organizationName?: string;
  aboutOrganization?: string;
  organizationImage?: string;
  hubId: string;
}

export interface HubGetJobParams {
  id: string;
}

export interface HubGetJobsQuery {
  page?: number;
  limit?: number;
  status?: JobStatus;
  hubId?: string;
  search?: string;
  category?: string;
  skills?: string;
}

/**
 * Get Stats Schema (GET /hub/:hubId/stats)
 */
export const hubGetStatsSchema = {
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
  response: {
    200: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: {
          type: 'object',
          properties: {
            jobs: { type: 'number' },
            proposals: { type: 'number' },
            contracts: { type: 'number' },
          },
        },
      },
    },
  },
} as const;

export interface HubGetStatsParams {
  hubId: string;
}

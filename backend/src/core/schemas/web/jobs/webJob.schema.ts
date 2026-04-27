import type { FastifySchema } from 'fastify';

// ============================================================================
// Types - Response Interfaces for Web Job Detail
// ============================================================================

/**
 * Service category info
 */
export interface WebJobServiceCategory {
  category: string;
  serviceType: string;
}

/**
 * Job budget info
 */
export interface WebJobBudget {
  pricingType: 'fixed' | 'hourly';
  fromAmount: number;
  upToAmount?: number;
}

/**
 * Client info - always shown for public job postings
 * Email is only included for authenticated users
 */
export interface WebJobClient {
  name: string;
  email?: string; // Only for authenticated users
  organizationName?: string;
  organizationImage?: string;
  aboutOrganization?: string;
}

/**
 * Hub info
 */
export interface WebJobHub {
  _id: string;
  name: string;
  slug: string;
  logo?: string;
}

/**
 * Full job detail response
 */
export interface WebJobDetailResponse {
  _id: string;
  jobTitle: string;
  jobDescription: string;
  jobSummary?: string;
  employmentType: string;
  status: string;
  serviceCategory: WebJobServiceCategory;
  expertLevel?: string;
  jobLocation?: string;
  preferredLocation?: string[];
  jobBudget: WebJobBudget;
  jobCurrency: string;
  jobStartDate?: string;
  jobEndDate?: string;
  jobSkills: string[];
  jobUploads?: string[];

  // Client info (always included for public job postings)
  client: WebJobClient;

  // Hub info
  hub?: WebJobHub;

  // Timestamps
  createdDate?: Date;
  createdAt: Date;
}

/**
 * Job list item (minimal data for listings)
 */
export interface WebJobListItem {
  _id: string;
  jobTitle: string;
  jobSummary?: string;
  employmentType: string;
  expertLevel?: string;
  jobLocation?: string;
  jobBudget: WebJobBudget;
  jobCurrency: string;
  jobStartDate?: string;
  jobEndDate?: string;
  serviceCategory: WebJobServiceCategory;
  organizationName?: string;
  createdDate?: Date;
  createdAt: Date;
}

/**
 * Job list result with pagination
 */
export interface WebJobListResult {
  jobs: WebJobListItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * Job list query options
 */
export interface WebJobListOptions {
  page?: number;
  limit?: number;
  category?: string;
  serviceType?: string;
  employmentType?: string;
  expertLevel?: string;
  jobLocation?: string;
  search?: string;
}

// ============================================================================
// JSON Schema Definitions for Validation
// ============================================================================

export const webJobDetailParamsSchema = {
  type: 'object',
  required: ['id'],
  properties: {
    id: { type: 'string', minLength: 1 },
  },
} as const;

export const webJobListQuerySchema = {
  type: 'object',
  properties: {
    page: { type: 'number', default: 1, minimum: 1 },
    limit: { type: 'number', default: 20, minimum: 1, maximum: 100 },
    category: { type: 'string' },
    serviceType: { type: 'string' },
    employmentType: { type: 'string', enum: ['full-time', 'freelance', 'part-time'] },
    expertLevel: { type: 'string' },
    jobLocation: { type: 'string' },
    search: { type: 'string' },
  },
} as const;

export const webSimilarJobsQuerySchema = {
  type: 'object',
  properties: {
    limit: { type: 'number', default: 6, minimum: 1, maximum: 20 },
  },
} as const;

// ============================================================================
// Fastify Route Schemas
// ============================================================================

export const getJobByIdSchema: FastifySchema = {
  params: webJobDetailParamsSchema,
  tags: ['Web - Jobs'],
  summary: 'Get job detail by ID',
  description:
    'Retrieves full job details for public viewing. Client info is only included for authenticated expert users.',
};

export const listJobsSchema: FastifySchema = {
  querystring: webJobListQuerySchema,
  tags: ['Web - Jobs'],
  summary: 'List public jobs',
  description: 'Lists all active public jobs with optional filtering',
};

export const getSimilarJobsSchema: FastifySchema = {
  params: webJobDetailParamsSchema,
  querystring: webSimilarJobsQuerySchema,
  tags: ['Web - Jobs'],
  summary: 'Get similar jobs',
  description: 'Retrieves similar jobs based on category and skills',
};

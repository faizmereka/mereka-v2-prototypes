import {
  bulkUpdateJobStatus,
  deleteJob,
  getJobById,
  getJobStats,
  listJobs,
  updateJobStatus,
} from '@controllers/admin';
import { requireAdminAuth } from '@core/middlewares/adminAuth.middleware';
import { EmploymentType, JobStatus } from '@core/models/Job';
import type { FastifyInstance } from 'fastify';

// Query schema for listing jobs (JSON Schema)
const listJobsQuerySchema = {
  type: 'object',
  properties: {
    page: { type: 'integer', minimum: 1, default: 1 },
    limit: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
    status: { type: 'string', enum: Object.values(JobStatus) },
    search: { type: 'string' },
    employmentType: { type: 'string', enum: Object.values(EmploymentType) },
    hubId: { type: 'string' },
    dateFrom: { type: 'string' },
    dateTo: { type: 'string' },
    sortBy: { type: 'string', default: 'createdAt' },
    sortOrder: { type: 'string', enum: ['asc', 'desc'], default: 'desc' },
  },
} as const;

// Update job status schema (JSON Schema)
const updateJobStatusSchema = {
  type: 'object',
  required: ['status'],
  properties: {
    status: { type: 'string', enum: Object.values(JobStatus) },
    reason: { type: 'string' },
  },
} as const;

// Bulk update jobs schema (JSON Schema)
const bulkUpdateJobsSchema = {
  type: 'object',
  required: ['jobIds', 'status'],
  properties: {
    jobIds: { type: 'array', items: { type: 'string' }, minItems: 1 },
    status: { type: 'string', enum: Object.values(JobStatus) },
  },
} as const;

/**
 * Admin job management routes
 * Base path: /api/v1/admin/jobs
 */
export async function adminJobRoutes(fastify: FastifyInstance): Promise<void> {
  // All routes require admin auth
  fastify.addHook('preHandler', requireAdminAuth);

  /**
   * Get job statistics
   */
  fastify.get('/stats', {
    schema: {
      tags: ['Admin - Jobs'],
      summary: 'Get job statistics',
      description: 'Get statistics about jobs (total, by status, proposals, contracts, recent)',
      security: [{ bearerAuth: [] }],
    },
    handler: getJobStats,
  });

  /**
   * List all jobs
   */
  fastify.get('/', {
    schema: {
      tags: ['Admin - Jobs'],
      summary: 'List all jobs',
      description: 'Get paginated list of jobs with filtering and sorting',
      querystring: listJobsQuerySchema,
      security: [{ bearerAuth: [] }],
    },
    handler: listJobs,
  });

  /**
   * Bulk update job status
   */
  fastify.post('/bulk-status', {
    schema: {
      tags: ['Admin - Jobs'],
      summary: 'Bulk update job status',
      description: 'Update status of multiple jobs at once',
      body: bulkUpdateJobsSchema,
      security: [{ bearerAuth: [] }],
    },
    handler: bulkUpdateJobStatus,
  });

  /**
   * Get job by ID
   */
  fastify.get('/:id', {
    schema: {
      tags: ['Admin - Jobs'],
      summary: 'Get job details',
      description: 'Get detailed job information by ID',
      security: [{ bearerAuth: [] }],
    },
    handler: getJobById,
  });

  /**
   * Update job status
   */
  fastify.patch('/:id/status', {
    schema: {
      tags: ['Admin - Jobs'],
      summary: 'Update job status',
      description: 'Update job status (activate, complete, cancel, etc.)',
      body: updateJobStatusSchema,
      security: [{ bearerAuth: [] }],
    },
    handler: updateJobStatus,
  });

  /**
   * Delete job (soft delete)
   */
  fastify.delete('/:id', {
    schema: {
      tags: ['Admin - Jobs'],
      summary: 'Delete job',
      description: 'Soft delete a job (sets status to CANCELLED)',
      security: [{ bearerAuth: [] }],
    },
    handler: deleteJob,
  });
}

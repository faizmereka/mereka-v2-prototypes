import {
  createJob,
  deleteJob,
  generateJobSummary,
  getJob,
  getJobs,
  updateJob,
} from '@controllers/hub';
import { requireAuth } from '@core/middlewares/auth.middleware';
import {
  hubCreateJobSchema,
  hubGenerateSummarySchema,
  hubGetJobSchema,
  hubGetJobsSchema,
  hubUpdateJobSchema,
} from '@schemas/hub';
import type { FastifyInstance } from 'fastify';

export async function hubJobRoutes(fastify: FastifyInstance) {
  // Create Job
  fastify.post('/', {
    schema: {
      tags: ['Jobs'],
      summary: 'Create a new job',
      description: 'Creates a new job posting',
      body: hubCreateJobSchema.body,
    },
    preHandler: [requireAuth],
    handler: createJob,
  });

  // Generate AI Summary
  fastify.post('/generate-summary', {
    schema: {
      tags: ['Jobs'],
      summary: 'Generate AI summary for job description',
      description: 'Uses AI to generate a concise summary from job description',
      body: hubGenerateSummarySchema.body,
    },
    handler: generateJobSummary,
  });

  // List Jobs
  fastify.get('/', {
    schema: {
      tags: ['Jobs'],
      summary: 'List jobs',
      querystring: hubGetJobsSchema.querystring,
    },
    handler: getJobs,
  });

  // Get Job by ID
  fastify.get('/:id', {
    schema: {
      tags: ['Jobs'],
      summary: 'Get job details',
      params: hubGetJobSchema.params,
    },
    handler: getJob,
  });

  // Update Job
  fastify.patch('/:id', {
    schema: {
      tags: ['Jobs'],
      summary: 'Update an existing job',
      description: 'Updates a job by ID',
      params: hubGetJobSchema.params,
      body: hubUpdateJobSchema.body,
    },
    handler: updateJob,
  });

  // Delete Job
  fastify.delete('/:id', {
    schema: {
      tags: ['Jobs'],
      summary: 'Delete job',
      params: hubGetJobSchema.params,
    },
    handler: deleteJob,
  });
}

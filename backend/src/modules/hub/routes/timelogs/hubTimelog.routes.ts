import {
  approveTimelog,
  createTimelog,
  deleteTimelog,
  getTimelog,
  getTimelogs,
  getWeeklySummary,
  rejectTimelog,
  submitTimelog,
  updateTimelog,
} from '@controllers/hub';
import { requireAuth } from '@core/middlewares/auth.middleware';
import {
  hubApproveTimelogSchema,
  hubCreateTimelogSchema,
  hubDeleteTimelogSchema,
  hubGetTimelogSchema,
  hubGetTimelogsSchema,
  hubGetWeeklySummarySchema,
  hubRejectTimelogSchema,
  hubSubmitTimelogSchema,
  hubUpdateTimelogSchema,
} from '@schemas/hub';
import type { FastifyInstance } from 'fastify';

export async function hubTimelogRoutes(fastify: FastifyInstance) {
  // Apply auth middleware to all routes in this scope
  fastify.addHook('preHandler', requireAuth);
  // Create Timelog Entry
  fastify.post('/', {
    schema: {
      tags: ['Timelogs'],
      summary: 'Create timelog entry',
      description: 'Expert creates a daily work log entry for hourly contract',
      body: hubCreateTimelogSchema.body,
    },
    handler: createTimelog,
  });

  // List Timelog Entries
  fastify.get('/', {
    schema: {
      tags: ['Timelogs'],
      summary: 'List timelog entries',
      description:
        'Get timelog entries with filters (contractId, expertId, status, year, week, month)',
      querystring: hubGetTimelogsSchema.querystring,
    },
    handler: getTimelogs,
  });

  // Get Weekly Summary
  fastify.get('/weekly-summary', {
    schema: {
      tags: ['Timelogs'],
      summary: 'Get weekly summary',
      description: 'Get weekly hours and payment summary for a contract',
      querystring: hubGetWeeklySummarySchema.querystring,
    },
    handler: getWeeklySummary,
  });

  // Get Timelog Entry by ID
  fastify.get('/:timelogId', {
    schema: {
      tags: ['Timelogs'],
      summary: 'Get timelog entry',
      params: hubGetTimelogSchema.params,
    },
    handler: getTimelog,
  });

  // Update Timelog Entry
  fastify.patch('/:timelogId', {
    schema: {
      tags: ['Timelogs'],
      summary: 'Update timelog entry',
      description: 'Update timelog entry (only if draft status)',
      params: hubUpdateTimelogSchema.params,
      body: hubUpdateTimelogSchema.body,
    },
    handler: updateTimelog,
  });

  // Delete Timelog Entry
  fastify.delete('/:timelogId', {
    schema: {
      tags: ['Timelogs'],
      summary: 'Delete timelog entry',
      description: 'Delete timelog entry (only if draft status)',
      params: hubDeleteTimelogSchema.params,
    },
    handler: deleteTimelog,
  });

  // Submit Timelog for Approval
  fastify.post('/:timelogId/submit', {
    schema: {
      tags: ['Timelogs'],
      summary: 'Submit timelog',
      description: 'Expert submits timelog entry for client approval',
      params: hubSubmitTimelogSchema.params,
    },
    handler: submitTimelog,
  });

  // Approve Timelog Entry
  fastify.post('/:timelogId/approve', {
    schema: {
      tags: ['Timelogs'],
      summary: 'Approve timelog',
      description: 'Client approves timelog entry and processes payment',
      params: hubApproveTimelogSchema.params,
      body: hubApproveTimelogSchema.body,
    },
    handler: approveTimelog,
  });

  // Reject Timelog Entry
  fastify.post('/:timelogId/reject', {
    schema: {
      tags: ['Timelogs'],
      summary: 'Reject timelog',
      description: 'Client rejects timelog entry with reason',
      params: hubRejectTimelogSchema.params,
      body: hubRejectTimelogSchema.body,
    },
    handler: rejectTimelog,
  });
}

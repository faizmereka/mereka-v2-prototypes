import {
  createNotificationTemplate,
  deleteNotificationTemplate,
  getAllNotificationTemplates,
  getNotificationTemplateById,
  getNotificationTemplateByTemplateId,
  searchNotificationTemplates,
  setNotificationTemplateStatus,
  updateNotificationTemplate,
} from '@controllers/admin';
import {
  adminCreateNotificationTemplateBodySchema,
  adminGetNotificationTemplatesQuerySchema,
  adminNotificationTemplateIdByKeyParamSchema,
  adminNotificationTemplateIdParamSchema,
  adminSearchNotificationTemplatesQuerySchema,
  adminSetNotificationTemplateStatusBodySchema,
  adminUpdateNotificationTemplateBodySchema,
} from '@schemas/admin';
import type { FastifyInstance } from 'fastify';

/**
 * Admin Notification Template Routes
 * Manages notification templates for SMS, Push, In-App, and Webhook notifications
 */
export async function adminNotificationTemplateRoutes(fastify: FastifyInstance): Promise<void> {
  // Create Notification Template
  fastify.post('/', {
    schema: {
      tags: ['Notification Templates'],
      summary: 'Create notification template',
      description:
        'Create a new notification template for SMS, Push, In-App, or Webhook notifications',
      body: adminCreateNotificationTemplateBodySchema.body,
    },
    handler: createNotificationTemplate,
  });

  // Get All Notification Templates (with pagination and filters)
  fastify.get('/', {
    schema: {
      tags: ['Notification Templates'],
      summary: 'List notification templates',
      description: 'Get paginated list of notification templates with optional filters',
      querystring: adminGetNotificationTemplatesQuerySchema.querystring,
    },
    handler: getAllNotificationTemplates,
  });

  // Search Notification Templates
  fastify.get('/search', {
    schema: {
      tags: ['Notification Templates'],
      summary: 'Search notification templates',
      description: 'Search templates by name, templateId, description, or tags',
      querystring: adminSearchNotificationTemplatesQuerySchema.querystring,
    },
    handler: searchNotificationTemplates,
  });

  // Get Notification Template by MongoDB ID
  fastify.get('/:id', {
    schema: {
      tags: ['Notification Templates'],
      summary: 'Get notification template by ID',
      description: 'Get a single notification template by MongoDB ObjectId',
      params: adminNotificationTemplateIdParamSchema.params,
    },
    handler: getNotificationTemplateById,
  });

  // Get Notification Template by templateId
  fastify.get('/template/:templateId', {
    schema: {
      tags: ['Notification Templates'],
      summary: 'Get notification template by templateId',
      description: 'Get a single notification template by its unique templateId',
      params: adminNotificationTemplateIdByKeyParamSchema.params,
    },
    handler: getNotificationTemplateByTemplateId,
  });

  // Update Notification Template by MongoDB ID
  fastify.patch('/:id', {
    schema: {
      tags: ['Notification Templates'],
      summary: 'Update notification template',
      description: 'Update notification template by MongoDB ObjectId',
      params: adminNotificationTemplateIdParamSchema.params,
      body: adminUpdateNotificationTemplateBodySchema.body,
    },
    handler: updateNotificationTemplate,
  });

  // Set Notification Template Status
  fastify.patch('/:id/status', {
    schema: {
      tags: ['Notification Templates'],
      summary: 'Set template status',
      description: 'Activate or deactivate a notification template',
      params: adminNotificationTemplateIdParamSchema.params,
      body: adminSetNotificationTemplateStatusBodySchema.body,
    },
    handler: setNotificationTemplateStatus,
  });

  // Delete Notification Template
  fastify.delete('/:id', {
    schema: {
      tags: ['Notification Templates'],
      summary: 'Delete notification template',
      description: 'Permanently delete a notification template',
      params: adminNotificationTemplateIdParamSchema.params,
    },
    handler: deleteNotificationTemplate,
  });
}

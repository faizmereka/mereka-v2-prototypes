import {
  createEmailTemplate,
  deleteEmailTemplate,
  getAllEmailTemplates,
  getEmailTemplateById,
  getEmailTemplateByTemplateId,
  searchEmailTemplates,
  setEmailTemplateStatus,
  updateEmailTemplate,
  updateEmailTemplateByTemplateId,
} from '@controllers/admin';
import {
  adminCreateEmailTemplateBodySchema,
  adminEmailTemplateIdParamSchema,
  adminGetEmailTemplatesQuerySchema,
  adminSearchEmailTemplatesQuerySchema,
  adminSetEmailTemplateStatusBodySchema,
  adminTemplateIdParamSchema,
  adminUpdateEmailTemplateBodySchema,
} from '@schemas/admin';
import type { FastifyInstance } from 'fastify';

/**
 * Admin Email Template Routes
 * Manages email templates for the notification system
 */
export async function adminEmailTemplateRoutes(fastify: FastifyInstance): Promise<void> {
  // Create Email Template
  fastify.post('/', {
    schema: {
      tags: ['Email Templates'],
      summary: 'Create email template',
      description: 'Create a new email template with HTML/text content and variables',
      body: adminCreateEmailTemplateBodySchema.body,
    },
    handler: createEmailTemplate,
  });

  // Get All Email Templates (with pagination and filters)
  fastify.get('/', {
    schema: {
      tags: ['Email Templates'],
      summary: 'List email templates',
      description: 'Get paginated list of email templates with optional filters',
      querystring: adminGetEmailTemplatesQuerySchema.querystring,
    },
    handler: getAllEmailTemplates,
  });

  // Search Email Templates
  fastify.get('/search', {
    schema: {
      tags: ['Email Templates'],
      summary: 'Search email templates',
      description: 'Search templates by name, templateId, description, or tags',
      querystring: adminSearchEmailTemplatesQuerySchema.querystring,
    },
    handler: searchEmailTemplates,
  });

  // Get Email Template by MongoDB ID
  fastify.get('/:id', {
    schema: {
      tags: ['Email Templates'],
      summary: 'Get email template by ID',
      description: 'Get a single email template by MongoDB ObjectId',
      params: adminEmailTemplateIdParamSchema.params,
    },
    handler: getEmailTemplateById,
  });

  // Get Email Template by templateId
  fastify.get('/template/:templateId', {
    schema: {
      tags: ['Email Templates'],
      summary: 'Get email template by templateId',
      description: 'Get a single email template by its unique templateId',
      params: adminTemplateIdParamSchema.params,
    },
    handler: getEmailTemplateByTemplateId,
  });

  // Update Email Template by MongoDB ID
  fastify.patch('/:id', {
    schema: {
      tags: ['Email Templates'],
      summary: 'Update email template',
      description: 'Update email template by MongoDB ObjectId',
      params: adminEmailTemplateIdParamSchema.params,
      body: adminUpdateEmailTemplateBodySchema.body,
    },
    handler: updateEmailTemplate,
  });

  // Update Email Template by templateId
  fastify.patch('/template/:templateId', {
    schema: {
      tags: ['Email Templates'],
      summary: 'Update email template by templateId',
      description: 'Update email template by its unique templateId',
      params: adminTemplateIdParamSchema.params,
      body: adminUpdateEmailTemplateBodySchema.body,
    },
    handler: updateEmailTemplateByTemplateId,
  });

  // Set Email Template Status
  fastify.patch('/:id/status', {
    schema: {
      tags: ['Email Templates'],
      summary: 'Set template status',
      description: 'Activate or deactivate an email template',
      params: adminEmailTemplateIdParamSchema.params,
      body: adminSetEmailTemplateStatusBodySchema.body,
    },
    handler: setEmailTemplateStatus,
  });

  // Delete Email Template
  fastify.delete('/:id', {
    schema: {
      tags: ['Email Templates'],
      summary: 'Delete email template',
      description: 'Permanently delete an email template',
      params: adminEmailTemplateIdParamSchema.params,
    },
    handler: deleteEmailTemplate,
  });
}

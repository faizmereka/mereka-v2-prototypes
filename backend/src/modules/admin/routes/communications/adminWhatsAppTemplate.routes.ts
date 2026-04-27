import {
  createWhatsAppTemplate,
  deleteWhatsAppTemplate,
  getAllWhatsAppTemplates,
  getWhatsAppTemplateById,
  getWhatsAppTemplateByTemplateId,
  getWhatsAppTemplateStats,
  searchWhatsAppTemplates,
  setWhatsAppTemplateStatus,
  updateWhatsAppTemplate,
  updateWhatsAppTemplateByTemplateId,
} from '@controllers/admin';
import {
  adminCreateWhatsAppTemplateBodySchema,
  adminGetWhatsAppTemplatesQuerySchema,
  adminSearchWhatsAppTemplatesQuerySchema,
  adminSetWhatsAppTemplateStatusBodySchema,
  adminUpdateWhatsAppTemplateBodySchema,
  adminWhatsAppTemplateIdByTemplateIdParamSchema,
  adminWhatsAppTemplateIdParamSchema,
} from '@schemas/admin';
import type { FastifyInstance } from 'fastify';

/**
 * Admin WhatsApp Template Routes
 * Manages WhatsApp templates for the notification system
 */
export async function adminWhatsAppTemplateRoutes(fastify: FastifyInstance): Promise<void> {
  // Create WhatsApp Template
  fastify.post('/', {
    schema: {
      tags: ['WhatsApp Templates'],
      summary: 'Create WhatsApp template',
      description: 'Create a new WhatsApp template with Meta template name and variables',
      body: adminCreateWhatsAppTemplateBodySchema.body,
    },
    handler: createWhatsAppTemplate,
  });

  // Get All WhatsApp Templates (with pagination and filters)
  fastify.get('/', {
    schema: {
      tags: ['WhatsApp Templates'],
      summary: 'List WhatsApp templates',
      description: 'Get paginated list of WhatsApp templates with optional filters',
      querystring: adminGetWhatsAppTemplatesQuerySchema.querystring,
    },
    handler: getAllWhatsAppTemplates,
  });

  // Get WhatsApp Template Stats
  fastify.get('/stats', {
    schema: {
      tags: ['WhatsApp Templates'],
      summary: 'Get WhatsApp template statistics',
      description: 'Get statistics about WhatsApp templates by category and status',
    },
    handler: getWhatsAppTemplateStats,
  });

  // Search WhatsApp Templates
  fastify.get('/search', {
    schema: {
      tags: ['WhatsApp Templates'],
      summary: 'Search WhatsApp templates',
      description: 'Search templates by name, templateId, title, or whatsAppTemplateName',
      querystring: adminSearchWhatsAppTemplatesQuerySchema.querystring,
    },
    handler: searchWhatsAppTemplates,
  });

  // Get WhatsApp Template by MongoDB ID
  fastify.get('/:id', {
    schema: {
      tags: ['WhatsApp Templates'],
      summary: 'Get WhatsApp template by ID',
      description: 'Get a single WhatsApp template by MongoDB ObjectId',
      params: adminWhatsAppTemplateIdParamSchema.params,
    },
    handler: getWhatsAppTemplateById,
  });

  // Get WhatsApp Template by templateId
  fastify.get('/template/:templateId', {
    schema: {
      tags: ['WhatsApp Templates'],
      summary: 'Get WhatsApp template by templateId',
      description: 'Get a single WhatsApp template by its unique templateId',
      params: adminWhatsAppTemplateIdByTemplateIdParamSchema.params,
    },
    handler: getWhatsAppTemplateByTemplateId,
  });

  // Update WhatsApp Template by MongoDB ID
  fastify.patch('/:id', {
    schema: {
      tags: ['WhatsApp Templates'],
      summary: 'Update WhatsApp template',
      description: 'Update WhatsApp template by MongoDB ObjectId',
      params: adminWhatsAppTemplateIdParamSchema.params,
      body: adminUpdateWhatsAppTemplateBodySchema.body,
    },
    handler: updateWhatsAppTemplate,
  });

  // Update WhatsApp Template by templateId
  fastify.patch('/template/:templateId', {
    schema: {
      tags: ['WhatsApp Templates'],
      summary: 'Update WhatsApp template by templateId',
      description: 'Update WhatsApp template by its unique templateId',
      params: adminWhatsAppTemplateIdByTemplateIdParamSchema.params,
      body: adminUpdateWhatsAppTemplateBodySchema.body,
    },
    handler: updateWhatsAppTemplateByTemplateId,
  });

  // Set WhatsApp Template Status
  fastify.patch('/:id/status', {
    schema: {
      tags: ['WhatsApp Templates'],
      summary: 'Set template status',
      description: 'Activate or deactivate a WhatsApp template',
      params: adminWhatsAppTemplateIdParamSchema.params,
      body: adminSetWhatsAppTemplateStatusBodySchema.body,
    },
    handler: setWhatsAppTemplateStatus,
  });

  // Delete WhatsApp Template
  fastify.delete('/:id', {
    schema: {
      tags: ['WhatsApp Templates'],
      summary: 'Delete WhatsApp template',
      description: 'Permanently delete a WhatsApp template',
      params: adminWhatsAppTemplateIdParamSchema.params,
    },
    handler: deleteWhatsAppTemplate,
  });
}

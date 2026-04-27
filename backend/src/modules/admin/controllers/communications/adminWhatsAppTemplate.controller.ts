import type {
  AdminCreateWhatsAppTemplateInput,
  AdminGetWhatsAppTemplatesQuery,
  AdminSearchWhatsAppTemplatesQuery,
  AdminSetWhatsAppTemplateStatusInput,
  AdminUpdateWhatsAppTemplateInput,
  AdminWhatsAppTemplateIdByTemplateIdParam,
  AdminWhatsAppTemplateIdParam,
} from '@schemas/admin';
import { adminWhatsAppTemplateService as whatsAppTemplateService } from '@services/admin';
import type { FastifyReply, FastifyRequest } from 'fastify';

/**
 * WhatsApp Template Controllers
 */

/**
 * Create WhatsApp template
 */
export async function createWhatsAppTemplate(
  request: FastifyRequest<{ Body: AdminCreateWhatsAppTemplateInput }>,
  reply: FastifyReply,
): Promise<void> {
  try {
    const template = await whatsAppTemplateService.createWhatsAppTemplate(request.body);
    return reply.status(201).send({
      success: true,
      data: template,
    });
  } catch (error) {
    request.log.error({ error, body: request.body }, 'Error creating WhatsApp template');
    return reply.status(400).send({
      success: false,
      error: {
        code: 'WHATSAPP_TEMPLATE_CREATE_ERROR',
        message: error instanceof Error ? error.message : 'Failed to create WhatsApp template',
      },
    });
  }
}

/**
 * Get WhatsApp template by MongoDB ID
 */
export async function getWhatsAppTemplateById(
  request: FastifyRequest<{ Params: AdminWhatsAppTemplateIdParam }>,
  reply: FastifyReply,
): Promise<void> {
  try {
    const template = await whatsAppTemplateService.getWhatsAppTemplateById(request.params.id);
    if (!template) {
      return reply.status(404).send({
        success: false,
        error: {
          code: 'WHATSAPP_TEMPLATE_NOT_FOUND',
          message: 'WhatsApp template not found',
        },
      });
    }
    return reply.send({
      success: true,
      data: template,
    });
  } catch (error) {
    request.log.error({ error, id: request.params.id }, 'Error getting WhatsApp template');
    return reply.status(500).send({
      success: false,
      error: {
        code: 'WHATSAPP_TEMPLATE_GET_ERROR',
        message: 'Failed to get WhatsApp template',
      },
    });
  }
}

/**
 * Get WhatsApp template by templateId
 */
export async function getWhatsAppTemplateByTemplateId(
  request: FastifyRequest<{ Params: AdminWhatsAppTemplateIdByTemplateIdParam }>,
  reply: FastifyReply,
): Promise<void> {
  try {
    const template = await whatsAppTemplateService.getWhatsAppTemplateByTemplateId(
      request.params.templateId,
    );
    if (!template) {
      return reply.status(404).send({
        success: false,
        error: {
          code: 'WHATSAPP_TEMPLATE_NOT_FOUND',
          message: 'WhatsApp template not found',
        },
      });
    }
    return reply.send({
      success: true,
      data: template,
    });
  } catch (error) {
    request.log.error(
      { error, templateId: request.params.templateId },
      'Error getting WhatsApp template',
    );
    return reply.status(500).send({
      success: false,
      error: {
        code: 'WHATSAPP_TEMPLATE_GET_ERROR',
        message: 'Failed to get WhatsApp template',
      },
    });
  }
}

/**
 * Get all WhatsApp templates with pagination and filters
 */
export async function getAllWhatsAppTemplates(
  request: FastifyRequest<{ Querystring: AdminGetWhatsAppTemplatesQuery }>,
  reply: FastifyReply,
): Promise<void> {
  try {
    const result = await whatsAppTemplateService.getAllWhatsAppTemplates(request.query);
    return reply.send({
      success: true,
      data: result.templates,
      meta: {
        total: result.total,
        page: result.page,
        limit: result.limit,
        totalPages: result.totalPages,
      },
    });
  } catch (error) {
    request.log.error({ error, query: request.query }, 'Error listing WhatsApp templates');
    return reply.status(500).send({
      success: false,
      error: {
        code: 'WHATSAPP_TEMPLATE_LIST_ERROR',
        message: 'Failed to list WhatsApp templates',
      },
    });
  }
}

/**
 * Update WhatsApp template by MongoDB ID
 */
export async function updateWhatsAppTemplate(
  request: FastifyRequest<{
    Params: AdminWhatsAppTemplateIdParam;
    Body: AdminUpdateWhatsAppTemplateInput;
  }>,
  reply: FastifyReply,
): Promise<void> {
  try {
    const template = await whatsAppTemplateService.updateWhatsAppTemplate(
      request.params.id,
      request.body,
    );
    if (!template) {
      return reply.status(404).send({
        success: false,
        error: {
          code: 'WHATSAPP_TEMPLATE_NOT_FOUND',
          message: 'WhatsApp template not found',
        },
      });
    }
    return reply.send({
      success: true,
      data: template,
    });
  } catch (error) {
    request.log.error({ error, id: request.params.id }, 'Error updating WhatsApp template');
    return reply.status(400).send({
      success: false,
      error: {
        code: 'WHATSAPP_TEMPLATE_UPDATE_ERROR',
        message: error instanceof Error ? error.message : 'Failed to update WhatsApp template',
      },
    });
  }
}

/**
 * Update WhatsApp template by templateId
 */
export async function updateWhatsAppTemplateByTemplateId(
  request: FastifyRequest<{
    Params: AdminWhatsAppTemplateIdByTemplateIdParam;
    Body: AdminUpdateWhatsAppTemplateInput;
  }>,
  reply: FastifyReply,
): Promise<void> {
  try {
    const template = await whatsAppTemplateService.updateWhatsAppTemplateByTemplateId(
      request.params.templateId,
      request.body,
    );
    if (!template) {
      return reply.status(404).send({
        success: false,
        error: {
          code: 'WHATSAPP_TEMPLATE_NOT_FOUND',
          message: 'WhatsApp template not found',
        },
      });
    }
    return reply.send({
      success: true,
      data: template,
    });
  } catch (error) {
    request.log.error(
      { error, templateId: request.params.templateId },
      'Error updating WhatsApp template',
    );
    return reply.status(400).send({
      success: false,
      error: {
        code: 'WHATSAPP_TEMPLATE_UPDATE_ERROR',
        message: error instanceof Error ? error.message : 'Failed to update WhatsApp template',
      },
    });
  }
}

/**
 * Delete WhatsApp template
 */
export async function deleteWhatsAppTemplate(
  request: FastifyRequest<{ Params: AdminWhatsAppTemplateIdParam }>,
  reply: FastifyReply,
): Promise<void> {
  try {
    const template = await whatsAppTemplateService.deleteWhatsAppTemplate(request.params.id);
    if (!template) {
      return reply.status(404).send({
        success: false,
        error: {
          code: 'WHATSAPP_TEMPLATE_NOT_FOUND',
          message: 'WhatsApp template not found',
        },
      });
    }
    return reply.send({
      success: true,
      message: 'WhatsApp template deleted successfully',
    });
  } catch (error) {
    request.log.error({ error, id: request.params.id }, 'Error deleting WhatsApp template');
    return reply.status(400).send({
      success: false,
      error: {
        code: 'WHATSAPP_TEMPLATE_DELETE_ERROR',
        message: error instanceof Error ? error.message : 'Failed to delete WhatsApp template',
      },
    });
  }
}

/**
 * Set WhatsApp template status (activate/deactivate)
 */
export async function setWhatsAppTemplateStatus(
  request: FastifyRequest<{
    Params: AdminWhatsAppTemplateIdParam;
    Body: AdminSetWhatsAppTemplateStatusInput;
  }>,
  reply: FastifyReply,
): Promise<void> {
  try {
    const template = await whatsAppTemplateService.setWhatsAppTemplateStatus(
      request.params.id,
      request.body.isActive,
    );
    if (!template) {
      return reply.status(404).send({
        success: false,
        error: {
          code: 'WHATSAPP_TEMPLATE_NOT_FOUND',
          message: 'WhatsApp template not found',
        },
      });
    }
    return reply.send({
      success: true,
      data: template,
    });
  } catch (error) {
    request.log.error({ error, id: request.params.id }, 'Error setting WhatsApp template status');
    return reply.status(400).send({
      success: false,
      error: {
        code: 'WHATSAPP_TEMPLATE_STATUS_ERROR',
        message: error instanceof Error ? error.message : 'Failed to set WhatsApp template status',
      },
    });
  }
}

/**
 * Search WhatsApp templates
 */
export async function searchWhatsAppTemplates(
  request: FastifyRequest<{ Querystring: AdminSearchWhatsAppTemplatesQuery }>,
  reply: FastifyReply,
): Promise<void> {
  try {
    const result = await whatsAppTemplateService.searchWhatsAppTemplates(request.query.query, {
      page: request.query.page,
      limit: request.query.limit,
    });
    return reply.send({
      success: true,
      data: result.templates,
      meta: {
        total: result.total,
        page: result.page,
        limit: result.limit,
        totalPages: result.totalPages,
      },
    });
  } catch (error) {
    request.log.error({ error, query: request.query }, 'Error searching WhatsApp templates');
    return reply.status(500).send({
      success: false,
      error: {
        code: 'WHATSAPP_TEMPLATE_SEARCH_ERROR',
        message: 'Failed to search WhatsApp templates',
      },
    });
  }
}

/**
 * Get WhatsApp template stats
 */
export async function getWhatsAppTemplateStats(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  try {
    const stats = await whatsAppTemplateService.getWhatsAppTemplateStats();
    return reply.send({
      success: true,
      data: stats,
    });
  } catch (error) {
    request.log.error({ error }, 'Error getting WhatsApp template stats');
    return reply.status(500).send({
      success: false,
      error: {
        code: 'WHATSAPP_TEMPLATE_STATS_ERROR',
        message: 'Failed to get WhatsApp template stats',
      },
    });
  }
}

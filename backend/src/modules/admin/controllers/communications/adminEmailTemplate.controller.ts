import type {
  AdminCreateEmailTemplateInput,
  AdminEmailTemplateIdParam,
  AdminGetEmailTemplatesQuery,
  AdminSearchEmailTemplatesQuery,
  AdminSetEmailTemplateStatusInput,
  AdminTemplateIdParam,
  AdminUpdateEmailTemplateInput,
} from '@schemas/admin';
import { adminEmailTemplateService as emailTemplateService } from '@services/admin';
import type { FastifyReply, FastifyRequest } from 'fastify';

/**
 * Email Template Controllers
 */

/**
 * Create email template
 */
export async function createEmailTemplate(
  request: FastifyRequest<{ Body: AdminCreateEmailTemplateInput }>,
  reply: FastifyReply,
): Promise<void> {
  try {
    const template = await emailTemplateService.createEmailTemplate(request.body);
    return reply.status(201).send({
      success: true,
      data: template,
    });
  } catch (error) {
    request.log.error({ error, body: request.body }, 'Error creating email template');
    return reply.status(400).send({
      success: false,
      error: {
        code: 'EMAIL_TEMPLATE_CREATE_ERROR',
        message: error instanceof Error ? error.message : 'Failed to create email template',
      },
    });
  }
}

/**
 * Get email template by MongoDB ID
 */
export async function getEmailTemplateById(
  request: FastifyRequest<{ Params: AdminEmailTemplateIdParam }>,
  reply: FastifyReply,
): Promise<void> {
  try {
    const template = await emailTemplateService.getEmailTemplateById(request.params.id);
    if (!template) {
      return reply.status(404).send({
        success: false,
        error: {
          code: 'EMAIL_TEMPLATE_NOT_FOUND',
          message: 'Email template not found',
        },
      });
    }
    return reply.send({
      success: true,
      data: template,
    });
  } catch (error) {
    request.log.error({ error, id: request.params.id }, 'Error getting email template');
    return reply.status(500).send({
      success: false,
      error: {
        code: 'EMAIL_TEMPLATE_GET_ERROR',
        message: 'Failed to get email template',
      },
    });
  }
}

/**
 * Get email template by templateId
 */
export async function getEmailTemplateByTemplateId(
  request: FastifyRequest<{ Params: AdminTemplateIdParam }>,
  reply: FastifyReply,
): Promise<void> {
  try {
    const template = await emailTemplateService.getEmailTemplateByTemplateId(
      request.params.templateId,
    );
    if (!template) {
      return reply.status(404).send({
        success: false,
        error: {
          code: 'EMAIL_TEMPLATE_NOT_FOUND',
          message: 'Email template not found',
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
      'Error getting email template',
    );
    return reply.status(500).send({
      success: false,
      error: {
        code: 'EMAIL_TEMPLATE_GET_ERROR',
        message: 'Failed to get email template',
      },
    });
  }
}

/**
 * Get all email templates with pagination and filters
 */
export async function getAllEmailTemplates(
  request: FastifyRequest<{ Querystring: AdminGetEmailTemplatesQuery }>,
  reply: FastifyReply,
): Promise<void> {
  try {
    const result = await emailTemplateService.getAllEmailTemplates(request.query);
    return reply.send({
      success: true,
      data: result.templates,
      meta: {
        total: result.total,
        page: result.page,
        limit: 20,
        totalPages: result.totalPages,
      },
    });
  } catch (error) {
    request.log.error({ error, query: request.query }, 'Error listing email templates');
    return reply.status(500).send({
      success: false,
      error: {
        code: 'EMAIL_TEMPLATE_LIST_ERROR',
        message: 'Failed to list email templates',
      },
    });
  }
}

/**
 * Update email template by MongoDB ID
 */
export async function updateEmailTemplate(
  request: FastifyRequest<{
    Params: AdminEmailTemplateIdParam;
    Body: AdminUpdateEmailTemplateInput;
  }>,
  reply: FastifyReply,
): Promise<void> {
  try {
    const template = await emailTemplateService.updateEmailTemplate(
      request.params.id,
      request.body,
    );
    if (!template) {
      return reply.status(404).send({
        success: false,
        error: {
          code: 'EMAIL_TEMPLATE_NOT_FOUND',
          message: 'Email template not found',
        },
      });
    }
    return reply.send({
      success: true,
      data: template,
    });
  } catch (error) {
    request.log.error({ error, id: request.params.id }, 'Error updating email template');
    return reply.status(400).send({
      success: false,
      error: {
        code: 'EMAIL_TEMPLATE_UPDATE_ERROR',
        message: error instanceof Error ? error.message : 'Failed to update email template',
      },
    });
  }
}

/**
 * Update email template by templateId
 */
export async function updateEmailTemplateByTemplateId(
  request: FastifyRequest<{
    Params: AdminTemplateIdParam;
    Body: AdminUpdateEmailTemplateInput;
  }>,
  reply: FastifyReply,
): Promise<void> {
  try {
    const template = await emailTemplateService.updateEmailTemplateByTemplateId(
      request.params.templateId,
      request.body,
    );
    if (!template) {
      return reply.status(404).send({
        success: false,
        error: {
          code: 'EMAIL_TEMPLATE_NOT_FOUND',
          message: 'Email template not found',
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
      'Error updating email template',
    );
    return reply.status(400).send({
      success: false,
      error: {
        code: 'EMAIL_TEMPLATE_UPDATE_ERROR',
        message: error instanceof Error ? error.message : 'Failed to update email template',
      },
    });
  }
}

/**
 * Delete email template
 */
export async function deleteEmailTemplate(
  request: FastifyRequest<{ Params: AdminEmailTemplateIdParam }>,
  reply: FastifyReply,
): Promise<void> {
  try {
    const template = await emailTemplateService.deleteEmailTemplate(request.params.id);
    if (!template) {
      return reply.status(404).send({
        success: false,
        error: {
          code: 'EMAIL_TEMPLATE_NOT_FOUND',
          message: 'Email template not found',
        },
      });
    }
    return reply.send({
      success: true,
      message: 'Email template deleted successfully',
    });
  } catch (error) {
    request.log.error({ error, id: request.params.id }, 'Error deleting email template');
    return reply.status(400).send({
      success: false,
      error: {
        code: 'EMAIL_TEMPLATE_DELETE_ERROR',
        message: error instanceof Error ? error.message : 'Failed to delete email template',
      },
    });
  }
}

/**
 * Set email template status (activate/deactivate)
 */
export async function setEmailTemplateStatus(
  request: FastifyRequest<{
    Params: AdminEmailTemplateIdParam;
    Body: AdminSetEmailTemplateStatusInput;
  }>,
  reply: FastifyReply,
): Promise<void> {
  try {
    const template = await emailTemplateService.setEmailTemplateStatus(
      request.params.id,
      request.body.isActive,
    );
    if (!template) {
      return reply.status(404).send({
        success: false,
        error: {
          code: 'EMAIL_TEMPLATE_NOT_FOUND',
          message: 'Email template not found',
        },
      });
    }
    return reply.send({
      success: true,
      data: template,
    });
  } catch (error) {
    request.log.error({ error, id: request.params.id }, 'Error setting email template status');
    return reply.status(400).send({
      success: false,
      error: {
        code: 'EMAIL_TEMPLATE_STATUS_ERROR',
        message: error instanceof Error ? error.message : 'Failed to set email template status',
      },
    });
  }
}

/**
 * Search email templates
 */
export async function searchEmailTemplates(
  request: FastifyRequest<{ Querystring: AdminSearchEmailTemplatesQuery }>,
  reply: FastifyReply,
): Promise<void> {
  try {
    const templates = await emailTemplateService.searchEmailTemplates(request.query.query);
    return reply.send({
      success: true,
      data: templates,
    });
  } catch (error) {
    request.log.error({ error, query: request.query }, 'Error searching email templates');
    return reply.status(500).send({
      success: false,
      error: {
        code: 'EMAIL_TEMPLATE_SEARCH_ERROR',
        message: 'Failed to search email templates',
      },
    });
  }
}

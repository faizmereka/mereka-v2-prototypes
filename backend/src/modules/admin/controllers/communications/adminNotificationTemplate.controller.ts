import type {
  AdminCreateNotificationTemplateInput,
  AdminGetNotificationTemplatesQuery,
  AdminNotificationTemplateIdByKeyParam,
  AdminNotificationTemplateIdParam,
  AdminSearchNotificationTemplatesQuery,
  AdminSetNotificationTemplateStatusInput,
  AdminUpdateNotificationTemplateInput,
} from '@schemas/admin';
import { adminNotificationTemplateService as notificationTemplateService } from '@services/admin';
import type { FastifyReply, FastifyRequest } from 'fastify';

/**
 * Notification Template Controllers
 */

/**
 * Create notification template
 */
export async function createNotificationTemplate(
  request: FastifyRequest<{ Body: AdminCreateNotificationTemplateInput }>,
  reply: FastifyReply,
): Promise<void> {
  try {
    const template = await notificationTemplateService.createNotificationTemplate(request.body);
    return reply.status(201).send({
      success: true,
      data: template,
    });
  } catch (error) {
    request.log.error({ error, body: request.body }, 'Error creating notification template');
    return reply.status(400).send({
      success: false,
      error: {
        code: 'NOTIFICATION_TEMPLATE_CREATE_ERROR',
        message: error instanceof Error ? error.message : 'Failed to create notification template',
      },
    });
  }
}

/**
 * Get notification template by MongoDB ID
 */
export async function getNotificationTemplateById(
  request: FastifyRequest<{ Params: AdminNotificationTemplateIdParam }>,
  reply: FastifyReply,
): Promise<void> {
  try {
    const template = await notificationTemplateService.getNotificationTemplateById(
      request.params.id,
    );
    if (!template) {
      return reply.status(404).send({
        success: false,
        error: {
          code: 'NOTIFICATION_TEMPLATE_NOT_FOUND',
          message: 'Notification template not found',
        },
      });
    }
    return reply.send({
      success: true,
      data: template,
    });
  } catch (error) {
    request.log.error({ error, id: request.params.id }, 'Error getting notification template');
    return reply.status(500).send({
      success: false,
      error: {
        code: 'NOTIFICATION_TEMPLATE_GET_ERROR',
        message: 'Failed to get notification template',
      },
    });
  }
}

/**
 * Get notification template by templateId
 */
export async function getNotificationTemplateByTemplateId(
  request: FastifyRequest<{ Params: AdminNotificationTemplateIdByKeyParam }>,
  reply: FastifyReply,
): Promise<void> {
  try {
    const template = await notificationTemplateService.getNotificationTemplateByTemplateId(
      request.params.templateId,
    );
    if (!template) {
      return reply.status(404).send({
        success: false,
        error: {
          code: 'NOTIFICATION_TEMPLATE_NOT_FOUND',
          message: 'Notification template not found',
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
      'Error getting notification template',
    );
    return reply.status(500).send({
      success: false,
      error: {
        code: 'NOTIFICATION_TEMPLATE_GET_ERROR',
        message: 'Failed to get notification template',
      },
    });
  }
}

/**
 * Get all notification templates with pagination and filters
 */
export async function getAllNotificationTemplates(
  request: FastifyRequest<{ Querystring: AdminGetNotificationTemplatesQuery }>,
  reply: FastifyReply,
): Promise<void> {
  try {
    const result = await notificationTemplateService.getAllNotificationTemplates(request.query);
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
    request.log.error({ error, query: request.query }, 'Error listing notification templates');
    return reply.status(500).send({
      success: false,
      error: {
        code: 'NOTIFICATION_TEMPLATE_LIST_ERROR',
        message: 'Failed to list notification templates',
      },
    });
  }
}

/**
 * Update notification template by MongoDB ID
 */
export async function updateNotificationTemplate(
  request: FastifyRequest<{
    Params: AdminNotificationTemplateIdParam;
    Body: AdminUpdateNotificationTemplateInput;
  }>,
  reply: FastifyReply,
): Promise<void> {
  try {
    const template = await notificationTemplateService.updateNotificationTemplate(
      request.params.id,
      request.body,
    );
    if (!template) {
      return reply.status(404).send({
        success: false,
        error: {
          code: 'NOTIFICATION_TEMPLATE_NOT_FOUND',
          message: 'Notification template not found',
        },
      });
    }
    return reply.send({
      success: true,
      data: template,
    });
  } catch (error) {
    request.log.error({ error, id: request.params.id }, 'Error updating notification template');
    return reply.status(400).send({
      success: false,
      error: {
        code: 'NOTIFICATION_TEMPLATE_UPDATE_ERROR',
        message: error instanceof Error ? error.message : 'Failed to update notification template',
      },
    });
  }
}

/**
 * Delete notification template
 */
export async function deleteNotificationTemplate(
  request: FastifyRequest<{ Params: AdminNotificationTemplateIdParam }>,
  reply: FastifyReply,
): Promise<void> {
  try {
    const template = await notificationTemplateService.deleteNotificationTemplate(
      request.params.id,
    );
    if (!template) {
      return reply.status(404).send({
        success: false,
        error: {
          code: 'NOTIFICATION_TEMPLATE_NOT_FOUND',
          message: 'Notification template not found',
        },
      });
    }
    return reply.send({
      success: true,
      message: 'Notification template deleted successfully',
    });
  } catch (error) {
    request.log.error({ error, id: request.params.id }, 'Error deleting notification template');
    return reply.status(400).send({
      success: false,
      error: {
        code: 'NOTIFICATION_TEMPLATE_DELETE_ERROR',
        message: error instanceof Error ? error.message : 'Failed to delete notification template',
      },
    });
  }
}

/**
 * Set notification template status (activate/deactivate)
 */
export async function setNotificationTemplateStatus(
  request: FastifyRequest<{
    Params: AdminNotificationTemplateIdParam;
    Body: AdminSetNotificationTemplateStatusInput;
  }>,
  reply: FastifyReply,
): Promise<void> {
  try {
    const template = await notificationTemplateService.setNotificationTemplateStatus(
      request.params.id,
      request.body.isActive,
    );
    if (!template) {
      return reply.status(404).send({
        success: false,
        error: {
          code: 'NOTIFICATION_TEMPLATE_NOT_FOUND',
          message: 'Notification template not found',
        },
      });
    }
    return reply.send({
      success: true,
      data: template,
    });
  } catch (error) {
    request.log.error(
      { error, id: request.params.id },
      'Error setting notification template status',
    );
    return reply.status(400).send({
      success: false,
      error: {
        code: 'NOTIFICATION_TEMPLATE_STATUS_ERROR',
        message:
          error instanceof Error ? error.message : 'Failed to set notification template status',
      },
    });
  }
}

/**
 * Search notification templates
 */
export async function searchNotificationTemplates(
  request: FastifyRequest<{ Querystring: AdminSearchNotificationTemplatesQuery }>,
  reply: FastifyReply,
): Promise<void> {
  try {
    const templates = await notificationTemplateService.searchNotificationTemplates(
      request.query.query,
    );
    return reply.send({
      success: true,
      data: templates,
    });
  } catch (error) {
    request.log.error({ error, query: request.query }, 'Error searching notification templates');
    return reply.status(500).send({
      success: false,
      error: {
        code: 'NOTIFICATION_TEMPLATE_SEARCH_ERROR',
        message: 'Failed to search notification templates',
      },
    });
  }
}

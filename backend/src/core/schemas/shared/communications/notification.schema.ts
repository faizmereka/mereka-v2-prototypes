import { InAppNotificationStatus } from '@core/models/InAppNotificationLog';

/**
 * Notification schemas - Native JSON Schema
 * Note: Date/number coercion and transforms handled by Fastify/controllers
 */

/**
 * Notification ID param schema
 */
export const sharedNotificationIdParamSchema = {
  type: 'object',
  required: ['id'],
  properties: {
    id: {
      type: 'string',
      pattern: '^[0-9a-fA-F]{24}$',
      description: 'Notification ID (MongoDB ObjectId)',
    },
  },
} as const;

/**
 * Get notifications query schema (admin)
 * Note: isRead transform handled in controller
 */
export const sharedGetNotificationsQuerySchema = {
  type: 'object',
  properties: {
    userId: {
      type: 'string',
      pattern: '^[0-9a-fA-F]{24}$',
      description: 'User ID filter',
    },
    templateId: {
      type: 'string',
      description: 'Template ID filter',
    },
    status: {
      type: 'string',
      enum: Object.values(InAppNotificationStatus),
      description: 'Notification status filter',
    },
    isRead: {
      type: 'string',
      enum: ['true', 'false'],
      description: 'Read status filter (will be transformed to boolean in controller)',
    },
    startDate: {
      type: 'string',
      format: 'date-time',
      description: 'Start date filter (ISO 8601)',
    },
    endDate: {
      type: 'string',
      format: 'date-time',
      description: 'End date filter (ISO 8601)',
    },
    page: {
      type: 'number',
      minimum: 1,
      default: 1,
      description: 'Page number',
    },
    limit: {
      type: 'number',
      minimum: 1,
      maximum: 100,
      default: 20,
      description: 'Items per page',
    },
  },
} as const;

/**
 * Get user notifications query schema
 * Note: isRead transform handled in controller
 */
export const sharedGetUserNotificationsQuerySchema = {
  type: 'object',
  properties: {
    isRead: {
      type: 'string',
      enum: ['true', 'false'],
      description: 'Read status filter (will be transformed to boolean in controller)',
    },
    page: {
      type: 'number',
      minimum: 1,
      default: 1,
      description: 'Page number',
    },
    limit: {
      type: 'number',
      minimum: 1,
      maximum: 100,
      default: 20,
      description: 'Items per page',
    },
  },
} as const;

/**
 * Search notifications query schema
 */
export const sharedSearchNotificationsQuerySchema = {
  type: 'object',
  required: ['query'],
  properties: {
    query: {
      type: 'string',
      minLength: 1,
      description: 'Search query',
    },
    startDate: {
      type: 'string',
      format: 'date-time',
      description: 'Start date filter (ISO 8601)',
    },
    endDate: {
      type: 'string',
      format: 'date-time',
      description: 'End date filter (ISO 8601)',
    },
    page: {
      type: 'number',
      minimum: 1,
      default: 1,
      description: 'Page number',
    },
    limit: {
      type: 'number',
      minimum: 1,
      maximum: 100,
      default: 20,
      description: 'Items per page',
    },
  },
} as const;

/**
 * Update notification status body schema
 */
export const sharedUpdateNotificationStatusBodySchema = {
  type: 'object',
  required: ['status'],
  properties: {
    status: {
      type: 'string',
      enum: Object.values(InAppNotificationStatus),
      description: 'New notification status',
    },
  },
} as const;

/**
 * Delete old notifications body schema
 */
export const sharedDeleteOldNotificationsBodySchema = {
  type: 'object',
  required: ['olderThanDays'],
  properties: {
    olderThanDays: {
      type: 'number',
      minimum: 1,
      maximum: 365,
      description: 'Delete notifications older than this many days',
    },
  },
} as const;

/**
 * Create notification body schema (admin)
 */
export const sharedCreateNotificationBodySchema = {
  type: 'object',
  required: ['userId', 'title', 'message'],
  properties: {
    userId: {
      type: 'string',
      pattern: '^[0-9a-fA-F]{24}$',
      description: 'User ID to send notification to',
    },
    templateId: {
      type: 'string',
      description: 'Template ID (optional)',
    },
    title: {
      type: 'string',
      minLength: 1,
      maxLength: 200,
      description: 'Notification title',
    },
    message: {
      type: 'string',
      minLength: 1,
      maxLength: 2000,
      description: 'Notification message',
    },
  },
} as const;

/**
 * Mark notifications as read body schema (bulk)
 */
export const sharedMarkNotificationsReadBodySchema = {
  type: 'object',
  required: ['notificationIds'],
  properties: {
    notificationIds: {
      type: 'array',
      items: {
        type: 'string',
        pattern: '^[0-9a-fA-F]{24}$',
      },
      minItems: 1,
      maxItems: 100,
      description: 'Array of notification IDs to mark as read',
    },
  },
} as const;

/**
 * TypeScript type definitions
 */
export interface SharedNotificationIdParam {
  id: string;
}

export interface SharedGetNotificationsQuery {
  userId?: string;
  templateId?: string;
  status?: InAppNotificationStatus;
  isRead?: string; // Will be transformed to boolean in controller
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

export interface SharedGetUserNotificationsQuery {
  isRead?: string; // Will be transformed to boolean in controller
  page?: number;
  limit?: number;
}

export interface SharedSearchNotificationsQuery {
  query: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

export interface SharedUpdateNotificationStatusInput {
  status: InAppNotificationStatus;
}

export interface SharedDeleteOldNotificationsInput {
  olderThanDays: number;
}

export interface SharedCreateNotificationInput {
  userId: string;
  templateId?: string;
  title: string;
  message: string;
}

export interface SharedMarkNotificationsReadInput {
  notificationIds: string[];
}

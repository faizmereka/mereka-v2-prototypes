/**
 * Admin notification template schemas - Native JSON Schema
 * Note: Transform for templateId (uppercase), isActive, page, limit handled in controller
 */

const objectIdPattern = '^[0-9a-fA-F]{24}$';

/**
 * Valid notification scopes
 */
const NOTIFICATION_SCOPES = ['user', 'hub'] as const;

/**
 * Valid target user types
 */
const TARGET_USER_TYPES = [
  'learner',
  'expert',
  'hub_owner',
  'hub_admin',
  'hub_collaborator',
] as const;

/**
 * Valid notification categories
 */
const NOTIFICATION_CATEGORIES = [
  'chats',
  'bookings',
  'jobs',
  'promotions',
  'system',
  'experiences',
  'members',
  'payments',
] as const;

/**
 * Create notification template schema
 * Note: templateId transform (uppercase) handled in controller
 */
export const adminCreateNotificationTemplateBodySchema = {
  body: {
    type: 'object',
    required: ['templateId', 'name', 'title', 'description', 'category', 'body'],
    properties: {
      templateId: {
        type: 'string',
        minLength: 1,
        maxLength: 100,
        description: 'Unique template ID (e.g., LEARNER_WELCOME) - will be converted to uppercase',
      },
      name: {
        type: 'string',
        minLength: 1,
        maxLength: 200,
        description: 'Human-readable template name',
      },
      title: {
        type: 'string',
        minLength: 1,
        description: 'Notification title (can contain wildcards like {{userName}})',
      },
      description: {
        type: 'string',
        minLength: 1,
        description: 'Description shown in preference settings UI',
      },
      category: {
        type: 'string',
        enum: NOTIFICATION_CATEGORIES,
        description: 'Category for grouping in settings UI',
      },
      body: {
        type: 'string',
        minLength: 1,
        description: 'Template body with wildcards (e.g., {{userName}}, {{bookingDate}})',
      },
      scope: {
        type: 'string',
        enum: NOTIFICATION_SCOPES,
        default: 'user',
        description: 'Notification scope: user (personal) or hub (hub-related)',
      },
      targetUserTypes: {
        type: 'array',
        items: {
          type: 'string',
          enum: TARGET_USER_TYPES,
        },
        default: [],
        description: 'Target user types. Empty array = all user types',
      },
    },
  },
} as const;

/**
 * Update notification template schema (all fields optional except ID)
 */
export const adminUpdateNotificationTemplateBodySchema = {
  body: {
    type: 'object',
    properties: {
      name: {
        type: 'string',
        minLength: 1,
        maxLength: 200,
        description: 'Human-readable template name',
      },
      title: {
        type: 'string',
        minLength: 1,
        description: 'Notification title',
      },
      description: {
        type: 'string',
        minLength: 1,
        description: 'Description shown in preference settings UI',
      },
      category: {
        type: 'string',
        enum: NOTIFICATION_CATEGORIES,
        description: 'Category for grouping in settings UI',
      },
      body: {
        type: 'string',
        minLength: 1,
        description: 'Template body with wildcards',
      },
      isActive: {
        type: 'boolean',
        description: 'Whether this template is active',
      },
      scope: {
        type: 'string',
        enum: NOTIFICATION_SCOPES,
        description: 'Notification scope: user (personal) or hub (hub-related)',
      },
      targetUserTypes: {
        type: 'array',
        items: {
          type: 'string',
          enum: TARGET_USER_TYPES,
        },
        description: 'Target user types. Empty array = all user types',
      },
    },
  },
} as const;

/**
 * Query notification templates schema
 * Note: Transform for isActive, page, limit handled in controller
 */
export const adminGetNotificationTemplatesQuerySchema = {
  querystring: {
    type: 'object',
    properties: {
      isActive: {
        type: 'string',
        enum: ['true', 'false'],
        description: 'Filter by active status (will be transformed to boolean)',
      },
      scope: {
        type: 'string',
        enum: NOTIFICATION_SCOPES,
        description: 'Filter by scope (user or hub)',
      },
      category: {
        type: 'string',
        enum: NOTIFICATION_CATEGORIES,
        description: 'Filter by category',
      },
      targetUserType: {
        type: 'string',
        enum: TARGET_USER_TYPES,
        description: 'Filter by target user type',
      },
      page: {
        type: 'number',
        minimum: 1,
        default: 1,
        description: 'Page number (default: 1)',
      },
      limit: {
        type: 'number',
        minimum: 1,
        default: 20,
        description: 'Items per page (default: 20)',
      },
    },
  },
} as const;

/**
 * Search notification templates query schema
 */
export const adminSearchNotificationTemplatesQuerySchema = {
  querystring: {
    type: 'object',
    required: ['query'],
    properties: {
      query: {
        type: 'string',
        minLength: 1,
        description: 'Search query string',
      },
    },
  },
} as const;

/**
 * Set notification template status schema
 */
export const adminSetNotificationTemplateStatusBodySchema = {
  body: {
    type: 'object',
    required: ['isActive'],
    properties: {
      isActive: {
        type: 'boolean',
        description: 'Active status to set',
      },
    },
  },
} as const;

/**
 * MongoDB ObjectId parameter schema
 */
export const adminNotificationTemplateIdParamSchema = {
  params: {
    type: 'object',
    required: ['id'],
    properties: {
      id: {
        type: 'string',
        pattern: objectIdPattern,
        description: 'Template ID (MongoDB ObjectId)',
      },
    },
  },
} as const;

/**
 * Template ID parameter schema
 * Note: Transform for templateId (uppercase) handled in controller
 */
export const adminNotificationTemplateIdByKeyParamSchema = {
  params: {
    type: 'object',
    required: ['templateId'],
    properties: {
      templateId: {
        type: 'string',
        minLength: 1,
        description: 'Template ID (will be converted to uppercase)',
      },
    },
  },
} as const;

/**
 * Scope type
 */
export type NotificationScopeType = (typeof NOTIFICATION_SCOPES)[number];

/**
 * Target user type
 */
export type TargetUserTypeType = (typeof TARGET_USER_TYPES)[number];

/**
 * Notification category type
 */
export type NotificationCategoryType = (typeof NOTIFICATION_CATEGORIES)[number];

/**
 * TypeScript type definitions
 */
export interface AdminCreateNotificationTemplateInput {
  templateId: string;
  name: string;
  title: string;
  description: string;
  category: NotificationCategoryType;
  body: string;
  scope?: NotificationScopeType;
  targetUserTypes?: TargetUserTypeType[];
}

export interface AdminUpdateNotificationTemplateInput {
  name?: string;
  title?: string;
  description?: string;
  category?: NotificationCategoryType;
  body?: string;
  isActive?: boolean;
  scope?: NotificationScopeType;
  targetUserTypes?: TargetUserTypeType[];
}

export interface AdminGetNotificationTemplatesQuery {
  isActive?: string; // Will be transformed to boolean
  scope?: NotificationScopeType;
  category?: NotificationCategoryType;
  targetUserType?: TargetUserTypeType;
  page?: number;
  limit?: number;
}

export interface AdminSearchNotificationTemplatesQuery {
  query: string;
}

export interface AdminSetNotificationTemplateStatusInput {
  isActive: boolean;
}

export interface AdminNotificationTemplateIdParam {
  id: string;
}

export interface AdminNotificationTemplateIdByKeyParam {
  templateId: string;
}

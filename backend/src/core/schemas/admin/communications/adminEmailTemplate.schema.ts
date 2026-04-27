/**
 * Admin email template schemas - Native JSON Schema
 * Note: Transform for templateId (uppercase) and isActive handled in controller
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
 * Valid email template categories
 */
const EMAIL_CATEGORIES = [
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
 * Email Template ID param schema
 */
export const adminEmailTemplateIdParamSchema = {
  params: {
    type: 'object',
    required: ['id'],
    properties: {
      id: {
        type: 'string',
        pattern: objectIdPattern,
        description: 'Email template ID',
      },
    },
  },
} as const;

/**
 * Create email template schema (simplified)
 * Note: templateId transform (uppercase) handled in controller
 */
export const adminCreateEmailTemplateBodySchema = {
  body: {
    type: 'object',
    required: ['templateId', 'name', 'title', 'description', 'category', 'sendGridTemplateId'],
    properties: {
      templateId: {
        type: 'string',
        minLength: 1,
        maxLength: 100,
        description: 'Template ID (will be converted to uppercase)',
      },
      name: {
        type: 'string',
        minLength: 1,
        maxLength: 200,
        description: 'Template name',
      },
      title: {
        type: 'string',
        minLength: 1,
        description: 'Title shown in preference settings UI',
      },
      description: {
        type: 'string',
        minLength: 1,
        description: 'Description shown in preference settings UI',
      },
      category: {
        type: 'string',
        enum: EMAIL_CATEGORIES,
        description: 'Category for grouping in settings UI',
      },
      sendGridTemplateId: {
        type: 'string',
        minLength: 1,
        description: 'SendGrid Template ID',
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
 * Update email template schema
 */
export const adminUpdateEmailTemplateBodySchema = {
  body: {
    type: 'object',
    properties: {
      name: {
        type: 'string',
        minLength: 1,
        maxLength: 200,
        description: 'Template name',
      },
      title: {
        type: 'string',
        minLength: 1,
        description: 'Title shown in preference settings UI',
      },
      description: {
        type: 'string',
        minLength: 1,
        description: 'Description shown in preference settings UI',
      },
      category: {
        type: 'string',
        enum: EMAIL_CATEGORIES,
        description: 'Category for grouping in settings UI',
      },
      sendGridTemplateId: {
        type: 'string',
        minLength: 1,
        description: 'SendGrid Template ID',
      },
      isActive: {
        type: 'boolean',
        description: 'Active status',
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
 * Get email templates query schema
 * Note: Transform for isActive handled in controller
 */
export const adminGetEmailTemplatesQuerySchema = {
  querystring: {
    type: 'object',
    properties: {
      isActive: {
        type: 'string',
        enum: ['true', 'false'],
        description: 'Active status filter (will be transformed to boolean)',
      },
      scope: {
        type: 'string',
        enum: NOTIFICATION_SCOPES,
        description: 'Filter by scope (user or hub)',
      },
      category: {
        type: 'string',
        enum: EMAIL_CATEGORIES,
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
  },
} as const;

/**
 * Search email templates query schema
 */
export const adminSearchEmailTemplatesQuerySchema = {
  querystring: {
    type: 'object',
    required: ['query'],
    properties: {
      query: {
        type: 'string',
        minLength: 1,
        description: 'Search query',
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
  },
} as const;

/**
 * Set email template status schema
 */
export const adminSetEmailTemplateStatusBodySchema = {
  body: {
    type: 'object',
    required: ['isActive'],
    properties: {
      isActive: {
        type: 'boolean',
        description: 'Active status',
      },
    },
  },
} as const;

/**
 * Template ID param schema (for lookup by templateId)
 * Note: Transform for templateId (uppercase) handled in controller
 */
export const adminTemplateIdParamSchema = {
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
export type EmailNotificationScopeType = (typeof NOTIFICATION_SCOPES)[number];

/**
 * Target user type
 */
export type EmailTargetUserTypeType = (typeof TARGET_USER_TYPES)[number];

/**
 * Email category type
 */
export type EmailCategoryType = (typeof EMAIL_CATEGORIES)[number];

/**
 * TypeScript type definitions
 */
export interface AdminEmailTemplateIdParam {
  id: string;
}

export interface AdminCreateEmailTemplateInput {
  templateId: string;
  name: string;
  title: string;
  description: string;
  category: EmailCategoryType;
  sendGridTemplateId: string;
  scope?: EmailNotificationScopeType;
  targetUserTypes?: EmailTargetUserTypeType[];
}

export interface AdminUpdateEmailTemplateInput {
  name?: string;
  title?: string;
  description?: string;
  category?: EmailCategoryType;
  sendGridTemplateId?: string;
  isActive?: boolean;
  scope?: EmailNotificationScopeType;
  targetUserTypes?: EmailTargetUserTypeType[];
}

export interface AdminGetEmailTemplatesQuery {
  isActive?: string; // Will be transformed to boolean
  scope?: EmailNotificationScopeType;
  category?: EmailCategoryType;
  targetUserType?: EmailTargetUserTypeType;
  page?: number;
  limit?: number;
}

export interface AdminSearchEmailTemplatesQuery {
  query: string;
  page?: number;
  limit?: number;
}

export interface AdminSetEmailTemplateStatusInput {
  isActive: boolean;
}

export interface AdminTemplateIdParam {
  templateId: string;
}

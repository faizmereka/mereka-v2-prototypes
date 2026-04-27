import { WhatsAppTemplateCategory } from '@core/models/WhatsAppTemplate';

/**
 * Admin WhatsApp template schemas - Native JSON Schema
 * Note: Transform for templateId (uppercase) handled in controller
 */

const objectIdPattern = '^[0-9a-fA-F]{24}$';

const NOTIFICATION_CATEGORIES = Object.values(WhatsAppTemplateCategory);

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
 * WhatsApp Template ID param schema
 */
export const adminWhatsAppTemplateIdParamSchema = {
  params: {
    type: 'object',
    required: ['id'],
    properties: {
      id: {
        type: 'string',
        pattern: objectIdPattern,
        description: 'WhatsApp template MongoDB ID',
      },
    },
  },
} as const;

/**
 * Create WhatsApp template schema
 * Note: templateId transform (uppercase) handled in service
 */
export const adminCreateWhatsAppTemplateBodySchema = {
  body: {
    type: 'object',
    required: [
      'templateId',
      'name',
      'title',
      'description',
      'category',
      'whatsAppTemplateName',
      'bodyPreview',
    ],
    properties: {
      templateId: {
        type: 'string',
        minLength: 1,
        maxLength: 100,
        description: 'Unique template ID (will be converted to uppercase)',
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
        maxLength: 200,
        description: 'Title shown in preference settings',
      },
      description: {
        type: 'string',
        minLength: 1,
        maxLength: 500,
        description: 'Description shown in preference settings',
      },
      category: {
        type: 'string',
        enum: NOTIFICATION_CATEGORIES,
        description: 'Template category for grouping',
      },
      whatsAppTemplateName: {
        type: 'string',
        minLength: 1,
        maxLength: 200,
        description: 'WhatsApp Business API template name from Meta',
      },
      languageCode: {
        type: 'string',
        minLength: 2,
        maxLength: 10,
        default: 'en',
        description: 'Template language code',
      },
      bodyPreview: {
        type: 'string',
        minLength: 1,
        description: 'Message body preview with {{placeholders}}',
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
 * Update WhatsApp template schema
 */
export const adminUpdateWhatsAppTemplateBodySchema = {
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
        maxLength: 200,
        description: 'Title shown in preference settings',
      },
      description: {
        type: 'string',
        minLength: 1,
        maxLength: 500,
        description: 'Description shown in preference settings',
      },
      category: {
        type: 'string',
        enum: NOTIFICATION_CATEGORIES,
        description: 'Template category for grouping',
      },
      whatsAppTemplateName: {
        type: 'string',
        minLength: 1,
        maxLength: 200,
        description: 'WhatsApp Business API template name from Meta',
      },
      languageCode: {
        type: 'string',
        minLength: 2,
        maxLength: 10,
        description: 'Template language code',
      },
      bodyPreview: {
        type: 'string',
        minLength: 1,
        description: 'Message body preview with {{placeholders}}',
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
 * Get WhatsApp templates query schema
 * Note: Transform for isActive handled in service
 */
export const adminGetWhatsAppTemplatesQuerySchema = {
  querystring: {
    type: 'object',
    properties: {
      isActive: {
        type: 'string',
        enum: ['true', 'false'],
        description: 'Active status filter (will be transformed to boolean)',
      },
      category: {
        type: 'string',
        enum: NOTIFICATION_CATEGORIES,
        description: 'Category filter',
      },
      scope: {
        type: 'string',
        enum: NOTIFICATION_SCOPES,
        description: 'Filter by scope (user or hub)',
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
 * Search WhatsApp templates query schema
 */
export const adminSearchWhatsAppTemplatesQuerySchema = {
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
        default: 50,
        description: 'Items per page',
      },
    },
  },
} as const;

/**
 * Set WhatsApp template status schema
 */
export const adminSetWhatsAppTemplateStatusBodySchema = {
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
 * WhatsApp Template ID param schema (for lookup by templateId)
 * Note: Transform for templateId (uppercase) handled in service
 */
export const adminWhatsAppTemplateIdByTemplateIdParamSchema = {
  params: {
    type: 'object',
    required: ['templateId'],
    properties: {
      templateId: {
        type: 'string',
        minLength: 1,
        description: 'WhatsApp template ID (will be converted to uppercase)',
      },
    },
  },
} as const;

/**
 * Scope type
 */
export type WhatsAppNotificationScopeType = (typeof NOTIFICATION_SCOPES)[number];

/**
 * Target user type
 */
export type WhatsAppTargetUserTypeType = (typeof TARGET_USER_TYPES)[number];

/**
 * TypeScript type definitions
 */
export interface AdminWhatsAppTemplateIdParam {
  id: string;
}

export interface AdminCreateWhatsAppTemplateInput {
  templateId: string;
  name: string;
  title: string;
  description: string;
  category: string;
  whatsAppTemplateName: string;
  languageCode?: string;
  bodyPreview: string;
  scope?: WhatsAppNotificationScopeType;
  targetUserTypes?: WhatsAppTargetUserTypeType[];
}

export interface AdminUpdateWhatsAppTemplateInput {
  name?: string;
  title?: string;
  description?: string;
  category?: string;
  whatsAppTemplateName?: string;
  languageCode?: string;
  bodyPreview?: string;
  isActive?: boolean;
  scope?: WhatsAppNotificationScopeType;
  targetUserTypes?: WhatsAppTargetUserTypeType[];
}

export interface AdminGetWhatsAppTemplatesQuery {
  isActive?: string;
  category?: string;
  scope?: WhatsAppNotificationScopeType;
  targetUserType?: WhatsAppTargetUserTypeType;
  page?: number;
  limit?: number;
}

export interface AdminSearchWhatsAppTemplatesQuery {
  query: string;
  page?: number;
  limit?: number;
}

export interface AdminSetWhatsAppTemplateStatusInput {
  isActive: boolean;
}

export interface AdminWhatsAppTemplateIdByTemplateIdParam {
  templateId: string;
}

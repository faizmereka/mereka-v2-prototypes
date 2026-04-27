import { AdminRole, AdminStatus } from '@core/models/AdminUser';

/**
 * Admin user schemas - Native JSON Schema
 * Note: Password validation with regex patterns handled by Fastify
 */

/**
 * Admin login schema
 */
export const adminLoginSchema = {
  type: 'object',
  required: ['email', 'password'],
  properties: {
    email: {
      type: 'string',
      format: 'email',
      description: 'Email address',
    },
    password: {
      type: 'string',
      minLength: 1,
      description: 'Password',
    },
    mfaCode: {
      type: 'string',
      minLength: 6,
      maxLength: 6,
      description: 'MFA code (6 digits, optional)',
    },
  },
} as const;

/**
 * Create admin user schema (for seeding or super admin creating other admins)
 */
export const adminCreateUserSchema = {
  type: 'object',
  required: ['email', 'password', 'name'],
  properties: {
    email: {
      type: 'string',
      format: 'email',
      description: 'Email address',
    },
    password: {
      type: 'string',
      minLength: 8,
      description: 'Password (min 8 characters)',
    },
    name: {
      type: 'string',
      minLength: 2,
      maxLength: 100,
      description: 'Admin name',
    },
    role: {
      type: 'string',
      enum: Object.values(AdminRole),
      default: AdminRole.PLATFORM_ADMIN,
      description: 'Admin role',
    },
  },
} as const;

/**
 * Update admin user schema
 */
export const adminUpdateUserSchema = {
  type: 'object',
  properties: {
    name: {
      type: 'string',
      minLength: 2,
      maxLength: 100,
      description: 'Admin name',
    },
    status: {
      type: 'string',
      enum: Object.values(AdminStatus),
      description: 'Admin status',
    },
    role: {
      type: 'string',
      enum: Object.values(AdminRole),
      description: 'Admin role',
    },
    ipWhitelist: {
      type: 'array',
      items: {
        type: 'string',
      },
      description: 'IP whitelist',
    },
  },
} as const;

/**
 * Change password schema
 * Note: Password complexity validation handled in controller
 */
export const adminChangePasswordSchema = {
  type: 'object',
  required: ['currentPassword', 'newPassword'],
  properties: {
    currentPassword: {
      type: 'string',
      minLength: 1,
      description: 'Current password',
    },
    newPassword: {
      type: 'string',
      minLength: 8,
      pattern: '^(?=.*[A-Z])(?=.*[a-z])(?=.*[0-9]).+$',
      description: 'New password (min 8 chars, must contain uppercase, lowercase, and number)',
    },
  },
} as const;

/**
 * Reset password schema (for forgot password flow)
 * Note: Password complexity validation handled in controller
 */
export const adminResetPasswordSchema = {
  type: 'object',
  required: ['token', 'newPassword'],
  properties: {
    token: {
      type: 'string',
      minLength: 1,
      description: 'Reset token',
    },
    newPassword: {
      type: 'string',
      minLength: 8,
      pattern: '^(?=.*[A-Z])(?=.*[a-z])(?=.*[0-9]).+$',
      description: 'New password (min 8 chars, must contain uppercase, lowercase, and number)',
    },
  },
} as const;

/**
 * Set admin password schema (super admin setting another admin's password)
 * Note: Password complexity validation handled in controller
 */
export const adminSetPasswordSchema = {
  type: 'object',
  required: ['newPassword'],
  properties: {
    newPassword: {
      type: 'string',
      minLength: 8,
      pattern: '^(?=.*[A-Z])(?=.*[a-z])(?=.*[0-9]).+$',
      description: 'New password (min 8 chars, must contain uppercase, lowercase, and number)',
    },
  },
} as const;

/**
 * Query admin users schema
 */
export const adminQueryUsersSchema = {
  type: 'object',
  properties: {
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
    status: {
      type: 'string',
      enum: Object.values(AdminStatus),
      description: 'Status filter',
    },
    role: {
      type: 'string',
      enum: Object.values(AdminRole),
      description: 'Role filter',
    },
    search: {
      type: 'string',
      description: 'Search query',
    },
  },
} as const;

/**
 * Forgot password schema
 */
export const adminForgotPasswordSchema = {
  type: 'object',
  required: ['email'],
  properties: {
    email: {
      type: 'string',
      format: 'email',
      description: 'Email address',
    },
  },
} as const;

/**
 * Enable MFA schema
 */
export const adminEnableMfaSchema = {
  type: 'object',
  required: ['code'],
  properties: {
    code: {
      type: 'string',
      minLength: 6,
      maxLength: 6,
      description: 'MFA code (6 digits)',
    },
  },
} as const;

/**
 * Verify MFA schema
 */
export const adminVerifyMfaSchema = {
  type: 'object',
  required: ['code'],
  properties: {
    code: {
      type: 'string',
      minLength: 6,
      maxLength: 6,
      description: 'MFA code (6 digits)',
    },
  },
} as const;

/**
 * Admin user response schema (for API responses)
 */
export const adminUserResponseSchema = {
  type: 'object',
  properties: {
    _id: { type: 'string' },
    email: { type: 'string' },
    name: { type: 'string' },
    role: {
      type: 'string',
      enum: Object.values(AdminRole),
    },
    status: {
      type: 'string',
      enum: Object.values(AdminStatus),
    },
    mfaEnabled: { type: 'boolean' },
    lastLoginAt: { type: 'string', format: 'date-time' },
    createdAt: { type: 'string', format: 'date-time' },
    updatedAt: { type: 'string', format: 'date-time' },
  },
} as const;

/**
 * TypeScript type definitions
 */
export interface AdminLoginInput {
  email: string;
  password: string;
  mfaCode?: string;
}

export interface AdminCreateUserInput {
  email: string;
  password: string;
  name: string;
  role?: AdminRole;
}

export interface AdminUpdateUserInput {
  name?: string;
  status?: AdminStatus;
  role?: AdminRole;
  ipWhitelist?: string[];
}

export interface AdminChangePasswordInput {
  currentPassword: string;
  newPassword: string;
}

export interface AdminResetPasswordInput {
  token: string;
  newPassword: string;
}

export interface AdminSetPasswordInput {
  newPassword: string;
}

export interface AdminQueryUsersInput {
  page?: number;
  limit?: number;
  status?: AdminStatus;
  role?: AdminRole;
  search?: string;
}

export interface AdminForgotPasswordInput {
  email: string;
}

export interface AdminEnableMfaInput {
  code: string;
}

export interface AdminVerifyMfaInput {
  code: string;
}

export interface AdminUserResponse {
  _id: string;
  email: string;
  name: string;
  role: AdminRole;
  status: AdminStatus;
  mfaEnabled: boolean;
  lastLoginAt?: string;
  createdAt: string;
  updatedAt: string;
}

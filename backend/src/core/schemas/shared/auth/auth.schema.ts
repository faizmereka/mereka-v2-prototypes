/**
 * Authentication schemas - Native JSON Schema for Fastify validation
 */

/**
 * Register with email/password schema
 * Note: Password matching validation handled in controller
 */
export const sharedRegisterBodySchema = {
  type: 'object',
  required: ['name', 'email', 'birthDate', 'password', 'confirmPassword'],
  properties: {
    name: {
      type: 'string',
      minLength: 2,
      maxLength: 100,
      description: 'User full name',
    },
    email: {
      type: 'string',
      format: 'email',
      description: 'User email address',
    },
    birthDate: {
      type: 'string',
      pattern: '^\\d{2}/\\d{2}/\\d{4}$',
      description: 'Birth date (dd/mm/yyyy)',
    },
    password: {
      type: 'string',
      minLength: 8,
      maxLength: 128,
      description: 'Password (min 8 characters)',
    },
    confirmPassword: {
      type: 'string',
      minLength: 8,
      description: 'Confirm password',
    },
    currency: {
      type: 'string',
      description: 'Preferred currency (e.g., USD, IDR)',
    },
    timeZone: {
      type: 'string',
      description: 'User timezone',
    },
    locale: {
      type: 'string',
      description: 'User locale (e.g., en, id)',
    },
  },
} as const;

/**
 * Login with email/password schema
 */
export const sharedLoginEmailPasswordBodySchema = {
  type: 'object',
  required: ['email', 'password'],
  properties: {
    email: {
      type: 'string',
      format: 'email',
      description: 'User email address',
    },
    password: {
      type: 'string',
      minLength: 1,
      description: 'User password',
    },
  },
} as const;

/**
 * Login with Firebase (for social sign-in) schema
 */
export const sharedLoginBodySchema = {
  type: 'object',
  required: ['firebaseToken'],
  properties: {
    firebaseToken: {
      type: 'string',
      minLength: 1,
      description: 'Firebase ID token from frontend',
    },
    domain: {
      type: 'string',
      description: 'Domain (app.mereka.io, mereka.io, etc.)',
    },
  },
} as const;

/**
 * Refresh token request schema
 * Note: refreshToken is optional in body since it can also come from httpOnly cookie
 */
export const sharedRefreshTokenBodySchema = {
  type: 'object',
  properties: {
    refreshToken: {
      type: 'string',
      minLength: 1,
      description: 'Refresh token to exchange for new access token (optional if sent via cookie)',
    },
  },
} as const;

/**
 * Logout request schema
 */
export const sharedLogoutBodySchema = {
  type: 'object',
  properties: {
    refreshToken: {
      type: 'string',
      description: 'Specific token to revoke (optional, if not provided revokes all)',
    },
  },
} as const;

/**
 * Login response schema
 */
export const sharedLoginResponseSchema = {
  type: 'object',
  required: ['success', 'data'],
  properties: {
    success: {
      type: 'boolean',
      enum: [true],
    },
    data: {
      type: 'object',
      required: ['user', 'tokens'],
      properties: {
        user: {
          type: 'object',
          required: ['id', 'email', 'name', 'role', 'emailVerified'],
          properties: {
            id: { type: 'string' },
            email: { type: 'string' },
            name: { type: 'string' },
            role: { type: 'string' },
            emailVerified: { type: 'boolean' },
          },
        },
        tokens: {
          type: 'object',
          required: ['accessToken', 'refreshToken', 'expiresIn'],
          properties: {
            accessToken: {
              type: 'string',
              description: 'JWT access token (15min)',
            },
            refreshToken: {
              type: 'string',
              description: 'JWT refresh token (7 days)',
            },
            expiresIn: {
              type: 'number',
              description: 'Access token expiration in seconds',
            },
          },
        },
      },
    },
    message: {
      type: 'string',
    },
  },
} as const;

/**
 * Magic link request schema
 */
export const sharedMagicLinkBodySchema = {
  type: 'object',
  required: ['email'],
  properties: {
    email: {
      type: 'string',
      format: 'email',
      description: 'Email address',
    },
    redirectUrl: {
      type: 'string',
      format: 'uri',
      description: 'URL to redirect after login',
    },
  },
} as const;

/**
 * Verify magic link request schema
 */
export const sharedVerifyMagicLinkBodySchema = {
  type: 'object',
  required: ['token'],
  properties: {
    token: {
      type: 'string',
      minLength: 1,
      description: 'Magic link token from email',
    },
  },
} as const;

/**
 * Forgot password request schema
 */
export const sharedForgotPasswordBodySchema = {
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
 * Reset password request schema
 */
export const sharedResetPasswordBodySchema = {
  type: 'object',
  required: ['token', 'newPassword'],
  properties: {
    token: {
      type: 'string',
      minLength: 1,
      description: 'Reset token from email',
    },
    newPassword: {
      type: 'string',
      minLength: 8,
      description: 'New password (min 8 characters)',
    },
  },
} as const;

/**
 * Change password schema (for logged-in users)
 * Note: Password matching validation handled in controller
 */
export const sharedChangePasswordBodySchema = {
  type: 'object',
  required: ['currentPassword', 'newPassword', 'confirmPassword'],
  properties: {
    currentPassword: {
      type: 'string',
      minLength: 1,
      description: 'Current password',
    },
    newPassword: {
      type: 'string',
      minLength: 8,
      maxLength: 128,
      description: 'New password (min 8 characters)',
    },
    confirmPassword: {
      type: 'string',
      minLength: 8,
      description: 'Confirm new password',
    },
  },
} as const;

/**
 * TypeScript type definitions (manually defined to replace z.infer)
 */
export interface SharedUserStatusQuery {
  email: string;
}

export interface SharedRegisterInput {
  name: string;
  email: string;
  birthDate: string;
  password: string;
  confirmPassword: string;
  currency?: string;
  timeZone?: string;
  locale?: string;
}

export interface SharedLoginEmailPasswordInput {
  email: string;
  password: string;
}

export interface SharedLoginInput {
  firebaseToken: string;
  domain?: string;
}

export interface SharedRefreshTokenInput {
  refreshToken: string;
}

export interface SharedLogoutInput {
  refreshToken?: string;
}

export interface SharedChangePasswordInput {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export interface SharedMagicLinkInput {
  email: string;
  redirectUrl?: string;
}

export interface SharedVerifyMagicLinkInput {
  token: string;
}

export interface SharedForgotPasswordInput {
  email: string;
}

export interface SharedResetPasswordInput {
  token: string;
  newPassword: string;
}

// ============================================================================
// OTP (One-Time Password) Schemas
// ============================================================================

/**
 * Send OTP schema
 */
export const sharedSendOtpBodySchema = {
  type: 'object',
  required: ['email'],
  properties: {
    email: {
      type: 'string',
      format: 'email',
      description: 'Email address to send OTP to',
    },
  },
} as const;

/**
 * Verify OTP schema
 */
export const sharedVerifyOtpBodySchema = {
  type: 'object',
  required: ['email', 'otp'],
  properties: {
    email: {
      type: 'string',
      format: 'email',
      description: 'Email address',
    },
    otp: {
      type: 'string',
      minLength: 6,
      maxLength: 6,
      pattern: '^[0-9]{6}$',
      description: '6-digit OTP code',
    },
  },
} as const;

export interface SharedSendOtpInput {
  email: string;
}

export interface SharedVerifyOtpInput {
  email: string;
  otp: string;
}

// ============================================================================
// Check Email & Setup Password Schemas
// ============================================================================

/**
 * Check email query schema
 */
export const sharedCheckEmailQuerySchema = {
  type: 'object',
  required: ['email'],
  properties: {
    email: {
      type: 'string',
      format: 'email',
      description: 'Email address to check',
    },
  },
} as const;

/**
 * Setup password schema (for users without password)
 */
export const sharedSetupPasswordBodySchema = {
  type: 'object',
  required: ['email', 'password', 'confirmPassword'],
  properties: {
    email: {
      type: 'string',
      format: 'email',
      description: 'Email address',
    },
    password: {
      type: 'string',
      minLength: 8,
      maxLength: 128,
      description: 'New password (min 8 characters)',
    },
    confirmPassword: {
      type: 'string',
      minLength: 8,
      description: 'Confirm password',
    },
  },
} as const;

export interface SharedCheckEmailQuery {
  email: string;
}

export interface SharedSetupPasswordInput {
  email: string;
  password: string;
  confirmPassword: string;
}

// ============================================================================
// Email Verification Schemas
// ============================================================================

/**
 * Verify email query schema (for GET request with token in query)
 */
export const sharedVerifyEmailQuerySchema = {
  type: 'object',
  required: ['token'],
  properties: {
    token: {
      type: 'string',
      minLength: 1,
      description: 'Email verification token from the link',
    },
  },
} as const;

export interface SharedVerifyEmailQuery {
  token: string;
}

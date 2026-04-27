import { requireAuth } from '@core/middlewares/auth.middleware';
import {
  sharedChangePasswordBodySchema,
  sharedCheckEmailQuerySchema,
  sharedForgotPasswordBodySchema,
  sharedLoginBodySchema,
  sharedLoginEmailPasswordBodySchema,
  sharedRefreshTokenBodySchema,
  sharedRegisterBodySchema,
  sharedResetPasswordBodySchema,
  sharedSendOtpBodySchema,
  sharedSetupPasswordBodySchema,
  sharedVerifyEmailQuerySchema,
  sharedVerifyOtpBodySchema,
} from '@schemas/shared';
import type { FastifyInstance } from 'fastify';
import {
  changePassword,
  checkEmail,
  forgotPassword,
  getDevTokens,
  login,
  loginEmailPassword,
  logout,
  me,
  refreshToken,
  register,
  resendVerificationEmail,
  resetPassword,
  sendOtp,
  setupPassword,
  verifyEmail,
  verifyOtp,
} from '../controllers/auth.controller';

/**
 * Authentication routes - Core endpoints
 */
export async function authRoutes(fastify: FastifyInstance): Promise<void> {
  // ============================================
  // CORE ENDPOINTS (Active)
  // ============================================

  /**
   * Register with email and password
   */
  fastify.post('/register', {
    schema: {
      tags: ['Authentication'],
      summary: 'Register with email and password',
      description: 'Create a new account with email and password',
      body: sharedRegisterBodySchema,
    },
    handler: register,
  });

  /**
   * Login with email and password
   */
  fastify.post('/login', {
    schema: {
      tags: ['Authentication'],
      summary: 'Login with email and password',
      description: 'Login using email and password',
      body: sharedLoginEmailPasswordBodySchema,
    },
    handler: loginEmailPassword,
  });

  /**
   * Login with social (Firebase token)
   */
  fastify.post('/login/social', {
    schema: {
      tags: ['Authentication'],
      summary: 'Login with social account',
      description: 'Login using Firebase token for social authentication (Google, Facebook, etc.)',
      body: sharedLoginBodySchema,
    },
    handler: login,
  });

  /**
   * Refresh access token
   */
  fastify.post('/refresh', {
    schema: {
      tags: ['Authentication'],
      summary: 'Refresh access token',
      description: 'Get new access token using refresh token',
      body: sharedRefreshTokenBodySchema,
    },
    handler: refreshToken,
  });

  /**
   * Get current logged-in user
   */
  fastify.get('/me', {
    preHandler: [requireAuth],
    schema: {
      tags: ['Authentication'],
      summary: 'Get current user',
      description: 'Get authenticated user information',
      security: [{ bearerAuth: [] }],
    },
    handler: me,
  });

  /**
   * Logout - revoke refresh token and clear cookies
   */
  fastify.post('/logout', {
    preHandler: [requireAuth],
    schema: {
      tags: ['Authentication'],
      summary: 'Logout',
      description: 'Logout user and revoke refresh token',
      security: [{ bearerAuth: [] }],
    },
    handler: logout,
  });

  /**
   * Change password (for logged-in users)
   */
  fastify.post('/change-password', {
    preHandler: [requireAuth],
    schema: {
      tags: ['Authentication'],
      summary: 'Change password',
      description: 'Change password for logged-in user',
      body: sharedChangePasswordBodySchema,
      security: [{ bearerAuth: [] }],
    },
    handler: changePassword,
  });

  /**
   * Forgot password - Request reset email
   */
  fastify.post('/forgot-password', {
    schema: {
      tags: ['Authentication'],
      summary: 'Forgot password',
      description: 'Request password reset (token logged to console for now)',
      body: sharedForgotPasswordBodySchema,
    },
    handler: forgotPassword,
  });

  /**
   * Reset password with token
   */
  fastify.post('/reset-password', {
    schema: {
      tags: ['Authentication'],
      summary: 'Reset password',
      description: 'Reset password using token from forgot-password',
      body: sharedResetPasswordBodySchema,
    },
    handler: resetPassword,
  });

  // ============================================
  // OTP (One-Time Password) ENDPOINTS
  // ============================================

  /**
   * Send OTP to email for passwordless login
   */
  fastify.post('/otp/send', {
    schema: {
      tags: ['Authentication'],
      summary: 'Send OTP',
      description:
        'Send a 6-digit OTP to email for passwordless login. Rate limited to 3 active OTPs per email.',
      body: sharedSendOtpBodySchema,
    },
    handler: sendOtp,
  });

  /**
   * Verify OTP and login
   */
  fastify.post('/otp/verify', {
    schema: {
      tags: ['Authentication'],
      summary: 'Verify OTP',
      description:
        'Verify the OTP and login. Creates a new user if email does not exist. Max 5 attempts per OTP.',
      body: sharedVerifyOtpBodySchema,
    },
    handler: verifyOtp,
  });

  // ============================================
  // CHECK EMAIL & SETUP PASSWORD ENDPOINTS
  // ============================================

  /**
   * Check email status (exists, has password)
   */
  fastify.get('/check-email', {
    schema: {
      tags: ['Authentication'],
      summary: 'Check email status',
      description:
        'Check if email exists and whether user has a password set. Use to determine auth flow.',
      querystring: sharedCheckEmailQuerySchema,
    },
    handler: checkEmail,
  });

  /**
   * Setup password for users without one
   */
  fastify.post('/setup-password', {
    schema: {
      tags: ['Authentication'],
      summary: 'Setup password',
      description:
        "Set password for users who don't have one (Firebase migrated users, social login users, OTP-only users). Should be called after OTP verification.",
      body: sharedSetupPasswordBodySchema,
    },
    handler: setupPassword,
  });

  // ============================================
  // EMAIL VERIFICATION ENDPOINTS
  // ============================================

  /**
   * Verify email with token from verification link
   * Called when user clicks the link in their email
   */
  fastify.get('/verify-email', {
    schema: {
      tags: ['Authentication'],
      summary: 'Verify email',
      description: 'Verify email address using token from verification link',
      querystring: sharedVerifyEmailQuerySchema,
    },
    handler: verifyEmail,
  });

  /**
   * Resend email verification link
   * Requires authentication - sends new verification link to user
   */
  fastify.post('/resend-verification', {
    preHandler: [requireAuth],
    schema: {
      tags: ['Authentication'],
      summary: 'Resend verification email',
      description: 'Resend email verification link to authenticated user',
      security: [{ bearerAuth: [] }],
    },
    handler: resendVerificationEmail,
  });

  // ============================================
  // DEVELOPMENT ONLY ENDPOINTS
  // ============================================

  /**
   * Get tokens for testing (DEVELOPMENT ONLY)
   */
  if (process.env.NODE_ENV !== 'production') {
    fastify.get('/dev/tokens', {
      schema: {
        tags: ['Development'],
        summary: 'Get tokens for testing (DEV ONLY)',
        description:
          'Returns access and refresh tokens for a user by email. Only available in development.',
        querystring: {
          type: 'object',
          required: ['email'],
          properties: {
            email: { type: 'string', format: 'email' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'object',
                properties: {
                  user: { type: 'object' },
                  tokens: {
                    type: 'object',
                    properties: {
                      accessToken: { type: 'string' },
                      refreshToken: { type: 'string' },
                    },
                  },
                },
              },
            },
          },
        },
      },
      handler: getDevTokens,
    });
  }
}

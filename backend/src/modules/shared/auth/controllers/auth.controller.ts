import { User } from '@core/models/User';
import type { LoginRequest, RefreshTokenRequest } from '@core/types/auth-types';
import { getUserId } from '@core/utils/auth-helpers';
import type {
  SharedChangePasswordInput,
  SharedCheckEmailQuery,
  SharedForgotPasswordInput,
  SharedLoginEmailPasswordInput,
  SharedRegisterInput,
  SharedResetPasswordInput,
  SharedSendOtpInput,
  SharedSetupPasswordInput,
  SharedVerifyOtpInput,
} from '@schemas/shared';
import { AuthService, TokenService } from '@services/auth';
import type { FastifyReply, FastifyRequest } from 'fastify';

const authService = new AuthService();
const tokenService = new TokenService();

/**
 * Get cookie options for regular app auth (shared across them.io, app.mereka.io, checkout.mereka.io)
 * In development: No domain set (defaults to current host)
 * In production: Uses COOKIE_DOMAIN (.mereka.io) for cross-subdomain sharing
 */
function getAppCookieOptions() {
  const isProduction = process.env.NODE_ENV === 'production';
  return {
    httpOnly: true,
    secure: isProduction,
    // In development: don't set domain (defaults to current host)
    // In production: use configured domain for cross-subdomain cookies
    ...(isProduction && process.env.COOKIE_DOMAIN ? { domain: process.env.COOKIE_DOMAIN } : {}),
    sameSite: 'lax' as const,
    path: '/',
  };
}

/**
 * Register new user with email and password
 */
export async function register(
  request: FastifyRequest<{ Body: SharedRegisterInput }>,
  reply: FastifyReply,
) {
  try {
    const ipAddress = request.ip;

    // Register user and get tokens
    const { user, tokens } = await authService.registerWithEmail(request.body, ipAddress);

    // Set cookies using shared options
    const cookieOptions = getAppCookieOptions();

    reply.cookie('accessToken', tokens.accessToken, {
      ...cookieOptions,
      maxAge: 15 * 60, // 15 minutes
    });

    reply.cookie('refreshToken', tokens.refreshToken, {
      ...cookieOptions,
      maxAge: 7 * 24 * 60 * 60, // 7 days
    });

    return reply.status(201).send({
      success: true,
      data: {
        user: {
          id: String(user._id),
          email: user.email,
          name: user.name,
          birthDate: user.birthDate,
          emailVerified: user.emailVerified,
          profilePhoto: user.profilePhoto,
          authProviders: user.authProviders,
        },
        tokens, // Also return in response for flexibility
      },
      message: 'Registration successful',
    });
  } catch (error) {
    request.log.error({ error, body: request.body }, 'Registration failed');

    const statusCode =
      error instanceof Error && error.message.includes('already exists') ? 409 : 400;

    return reply.status(statusCode).send({
      success: false,
      error: {
        code: statusCode === 409 ? 'USER_ALREADY_EXISTS' : 'REGISTRATION_FAILED',
        message: error instanceof Error ? error.message : 'Registration failed',
      },
    });
  }
}

/**
 * Login with email and password
 */
export async function loginEmailPassword(
  request: FastifyRequest<{ Body: SharedLoginEmailPasswordInput }>,
  reply: FastifyReply,
) {
  try {
    const { email, password } = request.body;
    const ipAddress = request.ip;

    // Login with email/password and get tokens
    const { user, tokens } = await authService.loginWithEmail(email, password, ipAddress);

    // Set cookies using shared options
    const cookieOptions = getAppCookieOptions();

    reply.setCookie('accessToken', tokens.accessToken, {
      ...cookieOptions,
      maxAge: 15 * 60,
    });

    reply.setCookie('refreshToken', tokens.refreshToken, {
      ...cookieOptions,
      maxAge: 7 * 24 * 60 * 60,
    });

    return reply.status(200).send({
      success: true,
      data: {
        user: {
          id: String(user._id),
          email: user.email,
          name: user.name,
          emailVerified: user.emailVerified,
          profilePhoto: user.profilePhoto,
          authProviders: user.authProviders,
        },
        tokens, // Also return in response
      },
      message: 'Login successful',
    });
  } catch (error) {
    request.log.error({ error }, 'Login failed');

    return reply.status(401).send({
      success: false,
      error: {
        code: 'LOGIN_FAILED',
        message: error instanceof Error ? error.message : 'Invalid credentials',
      },
    });
  }
}

/**
 * Login with Firebase token (for social sign-in)
 */
export async function login(request: FastifyRequest<{ Body: LoginRequest }>, reply: FastifyReply) {
  try {
    const { firebaseToken, domain } = request.body;
    const ipAddress = request.ip;

    // Login with Firebase and get user + tokens
    const { user, tokens } = await authService.loginWithFirebase(firebaseToken, domain, ipAddress);

    // Set cookies using shared options
    const cookieOptions = getAppCookieOptions();

    reply.setCookie('accessToken', tokens.accessToken, {
      ...cookieOptions,
      maxAge: 15 * 60,
    });

    reply.setCookie('refreshToken', tokens.refreshToken, {
      ...cookieOptions,
      maxAge: 7 * 24 * 60 * 60,
    });

    return reply.status(200).send({
      success: true,
      data: {
        user: {
          id: String(user._id),
          email: user.email,
          name: user.name,
          birthDate: user.birthDate,
          emailVerified: user.emailVerified,
          profilePhoto: user.profilePhoto,
          authProviders: user.authProviders,
        },
        tokens, // Also return in response
      },
      message: 'Login successful',
    });
  } catch (error) {
    request.log.error({ error, body: request.body }, 'Login failed');

    return reply.status(401).send({
      success: false,
      error: {
        code: 'LOGIN_FAILED',
        message: error instanceof Error ? error.message : 'Login failed',
      },
    });
  }
}

/**
 * Refresh access token
 * Accepts refresh token from cookie or request body
 */
export async function refreshToken(
  request: FastifyRequest<{ Body: RefreshTokenRequest }>,
  reply: FastifyReply,
) {
  try {
    // Get refresh token from cookie or body (cookie takes precedence for httpOnly security)
    const refreshTokenFromCookie = request.cookies?.refreshToken;
    const refreshTokenFromBody = request.body?.refreshToken;
    const token = refreshTokenFromCookie || refreshTokenFromBody;

    if (!token) {
      return reply.status(400).send({
        success: false,
        error: {
          code: 'MISSING_REFRESH_TOKEN',
          message: 'Refresh token is required',
        },
      });
    }

    // Generate new tokens
    const tokens = await authService.refreshAccessToken(token);

    // Update cookies using shared options
    const cookieOptions = getAppCookieOptions();

    reply.setCookie('accessToken', tokens.accessToken, {
      ...cookieOptions,
      maxAge: 15 * 60,
    });

    reply.setCookie('refreshToken', tokens.refreshToken, {
      ...cookieOptions,
      maxAge: 7 * 24 * 60 * 60,
    });

    return reply.status(200).send({
      success: true,
      data: {
        tokens, // Also return in response
      },
      message: 'Token refreshed successfully',
    });
  } catch (error) {
    request.log.error({ error }, 'Token refresh failed');

    return reply.status(401).send({
      success: false,
      error: {
        code: 'TOKEN_REFRESH_FAILED',
        message: error instanceof Error ? error.message : 'Token refresh failed',
      },
    });
  }
}

/**
 * Logout - revoke refresh token
 */
export async function logout(request: FastifyRequest, reply: FastifyReply) {
  try {
    // Get user ID from access token
    const user = (request as unknown as { user: { sub: string } }).user;

    if (!user) {
      return reply.status(401).send({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Not authenticated',
        },
      });
    }

    // Get refresh token from cookie or body
    const refreshTokenFromCookie = request.cookies?.refreshToken;
    const body = request.body as { refreshToken?: string };
    const token = refreshTokenFromCookie || body.refreshToken;

    // Logout (revoke tokens in database)
    await authService.logout(user.sub, token);

    // Clear cookies
    reply.clearCookie('accessToken', {
      path: '/',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
    });

    reply.clearCookie('refreshToken', {
      path: '/',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
    });

    return reply.status(200).send({
      success: true,
      message: 'Logged out successfully',
    });
  } catch (error) {
    request.log.error({ error }, 'Logout failed');

    return reply.status(500).send({
      success: false,
      error: {
        code: 'LOGOUT_FAILED',
        message: error instanceof Error ? error.message : 'Logout failed',
      },
    });
  }
}

/**
 * Change password (for logged-in users)
 */
export async function changePassword(
  request: FastifyRequest<{ Body: SharedChangePasswordInput }>,
  reply: FastifyReply,
) {
  try {
    const userId = getUserId(request);
    const { currentPassword, newPassword } = request.body;

    await authService.changePassword(userId, currentPassword, newPassword);

    return reply.status(200).send({
      success: true,
      message: 'Password changed successfully',
    });
  } catch (error) {
    request.log.error({ error }, 'Change password failed');

    const statusCode = error instanceof Error && error.message.includes('incorrect') ? 401 : 400;

    return reply.status(statusCode).send({
      success: false,
      error: {
        code: 'PASSWORD_CHANGE_FAILED',
        message: error instanceof Error ? error.message : 'Failed to change password',
      },
    });
  }
}

/**
 * Forgot password - Send reset email
 */
export async function forgotPassword(
  request: FastifyRequest<{ Body: SharedForgotPasswordInput }>,
  reply: FastifyReply,
) {
  try {
    const { email } = request.body;

    const { resetToken, resetLink } = await authService.requestPasswordReset(email);

    // TODO: Send email with resetLink in production
    // For now, we just log it (see console)

    return reply.status(200).send({
      success: true,
      message: 'If an account exists, a password reset email has been sent',
      // Include token in development for testing
      ...(process.env.NODE_ENV === 'development' && {
        dev: {
          resetToken,
          resetLink,
        },
      }),
    });
  } catch (error) {
    request.log.error({ error }, 'Forgot password failed');

    return reply.status(500).send({
      success: false,
      error: {
        code: 'FORGOT_PASSWORD_FAILED',
        message: 'Failed to process password reset request',
      },
    });
  }
}

/**
 * Reset password with token
 */
export async function resetPassword(
  request: FastifyRequest<{ Body: SharedResetPasswordInput }>,
  reply: FastifyReply,
) {
  try {
    const { token, newPassword } = request.body;

    await authService.resetPasswordWithToken(token, newPassword);

    return reply.status(200).send({
      success: true,
      message: 'Password reset successfully',
    });
  } catch (error) {
    request.log.error({ error }, 'Reset password failed');

    return reply.status(400).send({
      success: false,
      error: {
        code: 'RESET_PASSWORD_FAILED',
        message: error instanceof Error ? error.message : 'Failed to reset password',
      },
    });
  }
}

/**
 * Get current authenticated user (cross-domain session)
 */
export async function me(
  request: FastifyRequest<{
    Querystring: {
      includeHubs?: string;
      includePermissions?: string;
      includeSubscription?: string;
    };
  }>,
  reply: FastifyReply,
) {
  try {
    const userId = getUserId(request);
    const includeHubs = request.query.includeHubs === 'true';
    const includePermissions = request.query.includePermissions === 'true';
    const includeSubscription = request.query.includeSubscription === 'true';

    // Get full user from database
    const user = await authService.getUserFromToken(userId);

    if (!user) {
      return reply.status(404).send({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User not found',
        },
      });
    }

    // Base user data
    const userData: Record<string, unknown> = {
      id: String(user._id),
      email: user.email,
      name: user.name,
      birthDate: user.birthDate,
      status: user.status,
      emailVerified: user.emailVerified,
      profilePhoto: user.profilePhoto,
      bio: user.bio,
      phoneNumber: user.phoneNumber,
      authProviders: user.authProviders,
      lastLoginAt: user.lastLoginAt,
    };

    // Include hubs with or without permissions
    if (includePermissions) {
      // Get ALL hubs with their roles and permissions embedded
      // Also include subscription info if requested
      const hubsWithPermissions = await authService.getAllHubsWithPermissions(
        userId,
        includeSubscription,
      );
      userData.hubs = hubsWithPermissions;
    } else if (includeHubs) {
      // Only include hubs list without permissions
      const hubs = await authService.getUserHubs(userId);
      userData.hubs = hubs;
    }

    return reply.send({
      success: true,
      data: userData,
    });
  } catch (error) {
    request.log.error({ error }, 'Failed to get current user');

    return reply.status(500).send({
      success: false,
      error: {
        code: 'GET_USER_FAILED',
        message: 'Failed to get user information',
      },
    });
  }
}

// ============================================================================
// OTP (One-Time Password) Controllers
// ============================================================================

/**
 * Send OTP to email for passwordless login
 */
export async function sendOtp(
  request: FastifyRequest<{ Body: SharedSendOtpInput }>,
  reply: FastifyReply,
) {
  try {
    const { email } = request.body;

    const result = await authService.sendOtp(email);

    return reply.status(200).send({
      success: true,
      data: {
        message: result.message,
        expiresIn: result.expiresIn,
        otp: result.otp, // TODO: Remove in production - only for testing
      },
    });
  } catch (error) {
    request.log.error({ error }, 'Send OTP failed');

    // Rate limit error
    if (error instanceof Error && error.message.includes('Too many')) {
      return reply.status(429).send({
        success: false,
        error: {
          code: 'RATE_LIMITED',
          message: error.message,
        },
      });
    }

    return reply.status(500).send({
      success: false,
      error: {
        code: 'SEND_OTP_FAILED',
        message: error instanceof Error ? error.message : 'Failed to send OTP',
      },
    });
  }
}

/**
 * Verify OTP and login user
 */
export async function verifyOtp(
  request: FastifyRequest<{ Body: SharedVerifyOtpInput }>,
  reply: FastifyReply,
) {
  try {
    const { email, otp } = request.body;
    const ipAddress = request.ip;

    const { user, tokens } = await authService.verifyOtp(email, otp, ipAddress);

    // Set cookies using shared options
    const cookieOptions = getAppCookieOptions();

    reply.setCookie('accessToken', tokens.accessToken, {
      ...cookieOptions,
      maxAge: 15 * 60, // 15 minutes
    });

    reply.setCookie('refreshToken', tokens.refreshToken, {
      ...cookieOptions,
      maxAge: 7 * 24 * 60 * 60, // 7 days
    });

    return reply.status(200).send({
      success: true,
      data: {
        user: {
          id: String(user._id),
          email: user.email,
          name: user.name,
          emailVerified: user.emailVerified,
          profilePhoto: user.profilePhoto,
          authProviders: user.authProviders,
        },
        tokens,
      },
      message: 'Login successful',
    });
  } catch (error) {
    request.log.error({ error }, 'Verify OTP failed');

    // Invalid OTP or expired
    if (
      error instanceof Error &&
      (error.message.includes('Invalid') || error.message.includes('expired'))
    ) {
      return reply.status(401).send({
        success: false,
        error: {
          code: 'INVALID_OTP',
          message: error.message,
        },
      });
    }

    // Too many attempts
    if (error instanceof Error && error.message.includes('attempts')) {
      return reply.status(429).send({
        success: false,
        error: {
          code: 'TOO_MANY_ATTEMPTS',
          message: error.message,
        },
      });
    }

    return reply.status(500).send({
      success: false,
      error: {
        code: 'VERIFY_OTP_FAILED',
        message: error instanceof Error ? error.message : 'Failed to verify OTP',
      },
    });
  }
}

// ============================================================================
// Check Email & Setup Password Controllers
// ============================================================================

/**
 * Check if email exists and has password
 */
export async function checkEmail(
  request: FastifyRequest<{ Querystring: SharedCheckEmailQuery }>,
  reply: FastifyReply,
) {
  try {
    const { email } = request.query;

    const result = await authService.checkEmail(email);

    return reply.status(200).send({
      success: true,
      data: result,
    });
  } catch (error) {
    request.log.error({ error }, 'Check email failed');

    return reply.status(500).send({
      success: false,
      error: {
        code: 'CHECK_EMAIL_FAILED',
        message: error instanceof Error ? error.message : 'Failed to check email',
      },
    });
  }
}

/**
 * Setup password for users without one (after OTP verification)
 */
export async function setupPassword(
  request: FastifyRequest<{ Body: SharedSetupPasswordInput }>,
  reply: FastifyReply,
) {
  try {
    const { email, password, confirmPassword } = request.body;
    const ipAddress = request.ip;

    // Validate passwords match
    if (password !== confirmPassword) {
      return reply.status(400).send({
        success: false,
        error: {
          code: 'PASSWORD_MISMATCH',
          message: 'Passwords do not match',
        },
      });
    }

    const { user, tokens } = await authService.setupPassword(email, password, ipAddress);

    // Set cookies using shared options
    const cookieOptions = getAppCookieOptions();

    reply.setCookie('accessToken', tokens.accessToken, {
      ...cookieOptions,
      maxAge: 15 * 60, // 15 minutes
    });

    reply.setCookie('refreshToken', tokens.refreshToken, {
      ...cookieOptions,
      maxAge: 7 * 24 * 60 * 60, // 7 days
    });

    return reply.status(200).send({
      success: true,
      data: {
        user: {
          id: String(user._id),
          email: user.email,
          name: user.name,
          emailVerified: user.emailVerified,
          profilePhoto: user.profilePhoto,
          authProviders: user.authProviders,
        },
        tokens,
      },
      message: 'Password setup successful',
    });
  } catch (error) {
    request.log.error({ error }, 'Setup password failed');

    // User already has password
    if (error instanceof Error && error.message.includes('already has')) {
      return reply.status(400).send({
        success: false,
        error: {
          code: 'PASSWORD_EXISTS',
          message: error.message,
        },
      });
    }

    // User not found
    if (error instanceof Error && error.message.includes('not found')) {
      return reply.status(404).send({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: error.message,
        },
      });
    }

    return reply.status(400).send({
      success: false,
      error: {
        code: 'SETUP_PASSWORD_FAILED',
        message: error instanceof Error ? error.message : 'Failed to setup password',
      },
    });
  }
}

// ============================================================================
// Email Verification Controllers
// ============================================================================

/**
 * Verify email with token from verification link
 * This is called when user clicks the link in their email
 */
export async function verifyEmail(
  request: FastifyRequest<{ Querystring: { token: string } }>,
  reply: FastifyReply,
) {
  try {
    const { token } = request.query;

    const result = await authService.verifyEmailWithToken(token);

    return reply.status(200).send({
      success: true,
      message: result.message,
    });
  } catch (error) {
    request.log.error({ error }, 'Email verification failed');

    return reply.status(400).send({
      success: false,
      error: {
        code: 'VERIFICATION_FAILED',
        message: error instanceof Error ? error.message : 'Email verification failed',
      },
    });
  }
}

/**
 * Resend email verification link
 * Called by authenticated user who hasn't verified their email
 */
export async function resendVerificationEmail(request: FastifyRequest, reply: FastifyReply) {
  try {
    const userId = getUserId(request);

    const result = await authService.resendVerificationEmail(userId);

    return reply.status(200).send({
      success: true,
      message: result.message,
    });
  } catch (error) {
    request.log.error({ error }, 'Resend verification email failed');

    return reply.status(400).send({
      success: false,
      error: {
        code: 'RESEND_FAILED',
        message: error instanceof Error ? error.message : 'Failed to resend verification email',
      },
    });
  }
}

// ============================================================================
// Development Only Controllers
// ============================================================================

/**
 * Get tokens for testing (DEVELOPMENT ONLY)
 * This endpoint bypasses normal authentication and generates tokens directly.
 */
export async function getDevTokens(
  request: FastifyRequest<{ Querystring: { email: string } }>,
  reply: FastifyReply,
) {
  // Double-check we're in development
  if (process.env.NODE_ENV === 'production') {
    return reply.status(403).send({
      success: false,
      error: {
        code: 'FORBIDDEN',
        message: 'This endpoint is not available in production',
      },
    });
  }

  try {
    const { email } = request.query;

    // Find user by email
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return reply.status(404).send({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: `User with email ${email} not found`,
        },
      });
    }

    // Generate tokens directly
    const tokens = tokenService.generateTokens(user);

    return reply.status(200).send({
      success: true,
      data: {
        user: {
          id: String(user._id),
          email: user.email,
          name: user.name,
          emailVerified: user.emailVerified,
          profilePhoto: user.profilePhoto,
        },
        tokens: {
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
        },
      },
      message: 'DEV ONLY: Tokens generated for testing',
    });
  } catch (error) {
    request.log.error({ error }, 'Get dev tokens failed');

    return reply.status(500).send({
      success: false,
      error: {
        code: 'DEV_TOKENS_FAILED',
        message: error instanceof Error ? error.message : 'Failed to generate dev tokens',
      },
    });
  }
}

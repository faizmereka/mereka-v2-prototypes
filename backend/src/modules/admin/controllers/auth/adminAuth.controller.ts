import { getAdminId } from '@core/middlewares/adminAuth.middleware';
import { adminUserService } from '@core/services/admin';
import type { AdminChangePasswordInput, AdminLoginInput } from '@schemas/admin';
import type { FastifyReply, FastifyRequest } from 'fastify';

/**
 * Admin login with email and password
 */
export async function adminLogin(
  request: FastifyRequest<{ Body: AdminLoginInput }>,
  reply: FastifyReply,
) {
  try {
    const { email, password, mfaCode } = request.body;
    const ipAddress = request.ip;

    // Login admin
    const { admin, tokens, requiresMfa } = await adminUserService.login(
      email,
      password,
      ipAddress,
      mfaCode,
    );

    // If MFA is required but not provided
    if (requiresMfa) {
      return reply.status(200).send({
        success: true,
        data: {
          requiresMfa: true,
        },
        message: 'MFA code required',
      });
    }

    // Set cookies for admin domain
    const isProduction = process.env.NODE_ENV === 'production';
    const cookieOptions = {
      httpOnly: true,
      secure: isProduction,
      // In development: don't set domain (defaults to current host)
      // In production: use configured domain for cross-subdomain cookies
      ...(isProduction && process.env.ADMIN_COOKIE_DOMAIN
        ? { domain: process.env.ADMIN_COOKIE_DOMAIN }
        : {}),
      // In development: 'lax' allows cookies on same-site navigations
      // In production: 'strict' for maximum security
      sameSite: isProduction ? ('strict' as const) : ('lax' as const),
      path: '/',
    };

    reply.setCookie('adminAccessToken', tokens.accessToken, {
      ...cookieOptions,
      maxAge: 60 * 60, // 1 hour
    });

    reply.setCookie('adminRefreshToken', tokens.refreshToken, {
      ...cookieOptions,
      maxAge: 24 * 60 * 60, // 24 hours
    });

    return reply.status(200).send({
      success: true,
      data: {
        admin: {
          id: String(admin._id),
          email: admin.email,
          name: admin.name,
          role: admin.role,
          status: admin.status,
          mfaEnabled: admin.mfaEnabled,
          requirePasswordChange: admin.requirePasswordChange,
          lastLoginAt: admin.lastLoginAt,
        },
        tokens,
      },
      message: 'Login successful',
    });
  } catch (error) {
    request.log.error({ error }, 'Admin login failed');

    const message = error instanceof Error ? error.message : 'Invalid credentials';
    const isLocked = message.includes('locked');

    return reply.status(isLocked ? 423 : 401).send({
      success: false,
      error: {
        code: isLocked ? 'ACCOUNT_LOCKED' : 'LOGIN_FAILED',
        message,
      },
    });
  }
}

/**
 * Refresh admin access token
 */
export async function adminRefreshToken(
  request: FastifyRequest<{ Body: { refreshToken: string } }>,
  reply: FastifyReply,
) {
  try {
    // Get refresh token from body or cookie
    const refreshToken = request.body.refreshToken || request.cookies?.adminRefreshToken;

    if (!refreshToken) {
      return reply.status(400).send({
        success: false,
        error: {
          code: 'REFRESH_TOKEN_REQUIRED',
          message: 'Refresh token is required',
        },
      });
    }

    // Generate new tokens
    const tokens = await adminUserService.refreshAccessToken(refreshToken);

    // Update cookies with same options as login
    const isProduction = process.env.NODE_ENV === 'production';
    const cookieOptions = {
      httpOnly: true,
      secure: isProduction,
      ...(isProduction && process.env.ADMIN_COOKIE_DOMAIN
        ? { domain: process.env.ADMIN_COOKIE_DOMAIN }
        : {}),
      sameSite: isProduction ? ('strict' as const) : ('lax' as const),
      path: '/',
    };

    reply.setCookie('adminAccessToken', tokens.accessToken, {
      ...cookieOptions,
      maxAge: 60 * 60,
    });

    reply.setCookie('adminRefreshToken', tokens.refreshToken, {
      ...cookieOptions,
      maxAge: 24 * 60 * 60,
    });

    return reply.status(200).send({
      success: true,
      data: { tokens },
      message: 'Token refreshed successfully',
    });
  } catch (error) {
    request.log.error({ error }, 'Admin token refresh failed');

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
 * Admin logout
 */
export async function adminLogout(request: FastifyRequest, reply: FastifyReply) {
  try {
    const adminId = getAdminId(request);
    const refreshToken = request.cookies?.adminRefreshToken;

    // Logout (revoke tokens)
    await adminUserService.logout(adminId, refreshToken);

    // Clear cookies with same options as set
    const isProduction = process.env.NODE_ENV === 'production';
    const clearOptions = {
      ...(isProduction && process.env.ADMIN_COOKIE_DOMAIN
        ? { domain: process.env.ADMIN_COOKIE_DOMAIN }
        : {}),
      path: '/',
    };

    reply.clearCookie('adminAccessToken', clearOptions);
    reply.clearCookie('adminRefreshToken', clearOptions);

    return reply.status(200).send({
      success: true,
      message: 'Logged out successfully',
    });
  } catch (error) {
    request.log.error({ error }, 'Admin logout failed');

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
 * Get current admin user
 */
export async function adminMe(request: FastifyRequest, reply: FastifyReply) {
  try {
    const adminId = getAdminId(request);

    const admin = await adminUserService.getAdminById(adminId);

    if (!admin) {
      return reply.status(404).send({
        success: false,
        error: {
          code: 'ADMIN_NOT_FOUND',
          message: 'Admin not found',
        },
      });
    }

    return reply.status(200).send({
      success: true,
      data: {
        id: String(admin._id),
        email: admin.email,
        name: admin.name,
        role: admin.role,
        status: admin.status,
        mfaEnabled: admin.mfaEnabled,
        requirePasswordChange: admin.requirePasswordChange,
        lastLoginAt: admin.lastLoginAt,
        createdAt: admin.createdAt,
      },
    });
  } catch (error) {
    request.log.error({ error }, 'Get admin me failed');

    return reply.status(500).send({
      success: false,
      error: {
        code: 'GET_ADMIN_FAILED',
        message: error instanceof Error ? error.message : 'Failed to get admin',
      },
    });
  }
}

/**
 * Admin change password
 */
export async function adminChangePassword(
  request: FastifyRequest<{ Body: AdminChangePasswordInput }>,
  reply: FastifyReply,
) {
  try {
    const adminId = getAdminId(request);

    await adminUserService.changePassword(adminId, request.body);

    // Clear cookies to force re-login
    const isProduction = process.env.NODE_ENV === 'production';
    const clearOptions = {
      ...(isProduction && process.env.ADMIN_COOKIE_DOMAIN
        ? { domain: process.env.ADMIN_COOKIE_DOMAIN }
        : {}),
      path: '/',
    };

    reply.clearCookie('adminAccessToken', clearOptions);
    reply.clearCookie('adminRefreshToken', clearOptions);

    return reply.status(200).send({
      success: true,
      message: 'Password changed successfully. Please login again.',
    });
  } catch (error) {
    request.log.error({ error }, 'Admin change password failed');

    const message = error instanceof Error ? error.message : 'Failed to change password';
    const statusCode = message.includes('incorrect') ? 401 : 400;

    return reply.status(statusCode).send({
      success: false,
      error: {
        code: 'PASSWORD_CHANGE_FAILED',
        message,
      },
    });
  }
}

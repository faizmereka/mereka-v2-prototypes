import { env } from '@core/config/env';
import { AdminRole, AdminStatus, AdminUser, type IAdminUser } from '@core/models/AdminUser';
import type {
  AdminChangePasswordInput,
  AdminCreateUserInput,
  AdminUpdateUserInput,
} from '@schemas/admin';
import { PasswordService } from '@services/auth';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';

const passwordService = new PasswordService();

// Constants for brute force protection
const MAX_LOGIN_ATTEMPTS = 5;
const LOCK_TIME_MINUTES = 30;

/**
 * Admin token payload interface
 */
export interface AdminTokenPayload {
  sub: string;
  email: string;
  name: string;
  role: AdminRole;
  type: 'admin';
}

/**
 * Admin auth tokens interface
 */
export interface AdminAuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

/**
 * AdminUser service - Admin authentication and management
 */
export class AdminUserService {
  /**
   * Generate admin access token
   */
  private generateAdminAccessToken(admin: IAdminUser): string {
    const payload: AdminTokenPayload = {
      sub: String(admin._id),
      email: admin.email,
      name: admin.name,
      role: admin.role,
      type: 'admin',
    };

    return jwt.sign(payload, env.JWT_SECRET, {
      expiresIn: '1h', // Shorter expiry for admin tokens
    } as jwt.SignOptions);
  }

  /**
   * Generate admin refresh token
   */
  private generateAdminRefreshToken(adminId: string): string {
    const tokenId = uuidv4();

    const payload = {
      sub: adminId,
      type: 'admin-refresh',
      tokenId,
    };

    const refreshSecret = process.env.JWT_REFRESH_SECRET || env.JWT_SECRET;

    return jwt.sign(payload, refreshSecret, {
      expiresIn: '24h', // Shorter refresh for admin
    } as jwt.SignOptions);
  }

  /**
   * Generate both admin tokens
   */
  private generateAdminTokens(admin: IAdminUser): AdminAuthTokens {
    const accessToken = this.generateAdminAccessToken(admin);
    const refreshToken = this.generateAdminRefreshToken(String(admin._id));

    return {
      accessToken,
      refreshToken,
      expiresIn: 60 * 60, // 1 hour in seconds
    };
  }

  /**
   * Verify admin access token
   */
  verifyAdminAccessToken(token: string): AdminTokenPayload {
    try {
      const decoded = jwt.verify(token, env.JWT_SECRET) as AdminTokenPayload;

      if (decoded.type !== 'admin') {
        throw new Error('Invalid token type');
      }

      return decoded;
    } catch {
      throw new Error('Invalid or expired admin access token');
    }
  }

  /**
   * Verify admin refresh token
   */
  verifyAdminRefreshToken(token: string): { sub: string; type: string; tokenId: string } {
    try {
      const refreshSecret = process.env.JWT_REFRESH_SECRET || env.JWT_SECRET;
      const decoded = jwt.verify(token, refreshSecret) as {
        sub: string;
        type: string;
        tokenId: string;
      };

      if (decoded.type !== 'admin-refresh') {
        throw new Error('Invalid token type');
      }

      return decoded;
    } catch {
      throw new Error('Invalid or expired admin refresh token');
    }
  }

  /**
   * Create a new admin user
   */
  async createAdminUser(data: AdminCreateUserInput, createdById?: string): Promise<IAdminUser> {
    // Check if admin already exists
    const existingAdmin = await AdminUser.findOne({ email: data.email.toLowerCase() });
    if (existingAdmin) {
      throw new Error('Admin user with this email already exists');
    }

    // Hash password
    const hashedPassword = await passwordService.hashPassword(data.password);

    // Create admin user
    const admin = await AdminUser.create({
      email: data.email.toLowerCase(),
      password: hashedPassword,
      name: data.name,
      role: data.role || AdminRole.PLATFORM_ADMIN,
      status: AdminStatus.ACTIVE,
      createdBy: createdById,
      requirePasswordChange: true, // Force password change on first login
    });

    return admin;
  }

  /**
   * Admin login with email and password
   */
  async login(
    email: string,
    password: string,
    ipAddress?: string,
    mfaCode?: string,
  ): Promise<{ admin: IAdminUser; tokens: AdminAuthTokens; requiresMfa?: boolean }> {
    // Find admin by email (include password)
    const admin = await AdminUser.findOne({ email: email.toLowerCase() }).select(
      '+password +refreshTokens +mfaSecret',
    );

    if (!admin) {
      throw new Error('Invalid email or password');
    }

    // Check if account is locked
    if (admin.isLocked() && admin.lockedUntil) {
      const lockTimeRemaining = Math.ceil((admin.lockedUntil.getTime() - Date.now()) / 1000 / 60);
      throw new Error(`Account is locked. Try again in ${lockTimeRemaining} minutes`);
    }

    // Check if account is active
    if (admin.status !== AdminStatus.ACTIVE) {
      throw new Error('Account is not active. Contact support.');
    }

    // Check IP whitelist if configured
    if (admin.ipWhitelist && admin.ipWhitelist.length > 0 && ipAddress) {
      if (!admin.ipWhitelist.includes(ipAddress)) {
        throw new Error('Access denied from this IP address');
      }
    }

    // Verify password
    const isValidPassword = await passwordService.verifyPassword(password, admin.password);

    if (!isValidPassword) {
      // Increment login attempts
      admin.loginAttempts += 1;

      // Lock account if too many attempts
      if (admin.loginAttempts >= MAX_LOGIN_ATTEMPTS) {
        admin.lockedUntil = new Date(Date.now() + LOCK_TIME_MINUTES * 60 * 1000);
      }

      await admin.save();
      throw new Error('Invalid email or password');
    }

    // Check MFA if enabled
    if (admin.mfaEnabled) {
      if (!mfaCode) {
        return {
          admin,
          tokens: { accessToken: '', refreshToken: '', expiresIn: 0 },
          requiresMfa: true,
        };
      }

      // TODO: Verify MFA code with speakeasy or similar
      // For now, just check if code is provided
      if (mfaCode.length !== 6) {
        throw new Error('Invalid MFA code');
      }
    }

    // Reset login attempts on successful login
    admin.loginAttempts = 0;
    admin.lockedUntil = undefined;
    admin.lastLoginAt = new Date();
    admin.lastLoginIp = ipAddress;
    await admin.save();

    // Generate tokens
    const tokens = this.generateAdminTokens(admin);

    // Store refresh token
    await this.storeRefreshToken(admin, tokens.refreshToken);

    return { admin, tokens };
  }

  /**
   * Store refresh token
   */
  private async storeRefreshToken(admin: IAdminUser, refreshToken: string): Promise<void> {
    const refreshTokens = admin.refreshTokens || [];
    refreshTokens.push(refreshToken);

    // Keep only last 3 tokens for admin (stricter than users)
    if (refreshTokens.length > 3) {
      refreshTokens.shift();
    }

    await AdminUser.findByIdAndUpdate(admin._id, { refreshTokens });
  }

  /**
   * Refresh admin access token
   */
  async refreshAccessToken(refreshToken: string): Promise<AdminAuthTokens> {
    // Verify refresh token
    const decoded = this.verifyAdminRefreshToken(refreshToken);

    // Check if token is in admin's valid tokens
    const admin = await AdminUser.findById(decoded.sub).select('+refreshTokens');

    if (!admin) {
      throw new Error('Admin not found');
    }

    if (!admin.refreshTokens?.includes(refreshToken)) {
      throw new Error('Invalid refresh token');
    }

    // Generate new tokens
    const tokens = this.generateAdminTokens(admin);

    // Replace old refresh token with new one
    await AdminUser.findByIdAndUpdate(admin._id, {
      $pull: { refreshTokens: refreshToken },
      $push: { refreshTokens: tokens.refreshToken },
    });

    return tokens;
  }

  /**
   * Logout admin
   */
  async logout(adminId: string, refreshToken?: string): Promise<void> {
    if (refreshToken) {
      await AdminUser.findByIdAndUpdate(adminId, {
        $pull: { refreshTokens: refreshToken },
      });
    } else {
      // Logout from all devices
      await AdminUser.findByIdAndUpdate(adminId, {
        $set: { refreshTokens: [] },
      });
    }
  }

  /**
   * Get admin by ID
   */
  async getAdminById(adminId: string): Promise<IAdminUser | null> {
    return await AdminUser.findById(adminId);
  }

  /**
   * Get admin by email
   */
  async getAdminByEmail(email: string): Promise<IAdminUser | null> {
    return await AdminUser.findOne({ email: email.toLowerCase() });
  }

  /**
   * Update admin user
   */
  async updateAdmin(
    adminId: string,
    data: AdminUpdateUserInput,
    updatedById?: string,
  ): Promise<IAdminUser | null> {
    return await AdminUser.findByIdAndUpdate(
      adminId,
      { ...data, updatedBy: updatedById },
      { new: true },
    );
  }

  /**
   * Change admin password
   */
  async changePassword(adminId: string, data: AdminChangePasswordInput): Promise<void> {
    const admin = await AdminUser.findById(adminId).select('+password');

    if (!admin) {
      throw new Error('Admin not found');
    }

    // Verify current password
    const isValidPassword = await passwordService.verifyPassword(
      data.currentPassword,
      admin.password,
    );

    if (!isValidPassword) {
      throw new Error('Current password is incorrect');
    }

    // Hash and save new password
    admin.password = await passwordService.hashPassword(data.newPassword);
    admin.passwordChangedAt = new Date();
    admin.requirePasswordChange = false;

    // Invalidate all refresh tokens (force re-login)
    admin.refreshTokens = [];

    await admin.save();
  }

  /**
   * List all admins (for super admin)
   */
  async listAdmins(
    options: {
      page?: number;
      limit?: number;
      status?: AdminStatus;
      role?: AdminRole;
      search?: string;
    } = {},
  ): Promise<{ admins: IAdminUser[]; total: number; totalPages: number }> {
    const { page = 1, limit = 20, status, role, search } = options;
    const skip = (page - 1) * limit;

    // Build filter
    const filter: Record<string, unknown> = {};
    if (status) filter.status = status;
    if (role) filter.role = role;
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }

    const [admins, total] = await Promise.all([
      AdminUser.find(filter).skip(skip).limit(limit).sort({ createdAt: -1 }),
      AdminUser.countDocuments(filter),
    ]);

    return {
      admins,
      total,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get admin statistics
   */
  async getAdminStats(): Promise<{
    total: number;
    byStatus: { active: number; inactive: number; suspended: number };
    byRole: { superAdmin: number; platformAdmin: number };
    lockedAccounts: number;
  }> {
    const [total, statusCounts, roleCounts, lockedCount] = await Promise.all([
      AdminUser.countDocuments(),
      AdminUser.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
      AdminUser.aggregate([{ $group: { _id: '$role', count: { $sum: 1 } } }]),
      AdminUser.countDocuments({
        lockedUntil: { $gt: new Date() },
      }),
    ]);

    // Convert aggregation results to objects
    const byStatus = {
      active: 0,
      inactive: 0,
      suspended: 0,
    };
    for (const item of statusCounts) {
      if (item._id in byStatus) {
        byStatus[item._id as keyof typeof byStatus] = item.count;
      }
    }

    const byRole = {
      superAdmin: 0,
      platformAdmin: 0,
    };
    for (const item of roleCounts) {
      if (item._id in byRole) {
        byRole[item._id as keyof typeof byRole] = item.count;
      }
    }

    return {
      total,
      byStatus,
      byRole,
      lockedAccounts: lockedCount,
    };
  }

  /**
   * Get admin session info
   */
  async getAdminSessions(adminId: string): Promise<{
    adminId: string;
    name: string;
    email: string;
    lastLoginAt: Date | null;
    lastLoginIp: string | null;
    loginAttempts: number;
    lockedUntil: Date | null;
    activeSessions: number;
    isLocked: boolean;
  }> {
    const admin = await AdminUser.findById(adminId).select('+refreshTokens');

    if (!admin) {
      throw new Error('Admin not found');
    }

    return {
      adminId: String(admin._id),
      name: admin.name,
      email: admin.email,
      lastLoginAt: admin.lastLoginAt || null,
      lastLoginIp: admin.lastLoginIp || null,
      loginAttempts: admin.loginAttempts,
      lockedUntil: admin.lockedUntil || null,
      activeSessions: admin.refreshTokens?.length || 0,
      isLocked: admin.isLocked(),
    };
  }

  /**
   * Force logout admin from all sessions
   */
  async forceLogoutAdmin(adminId: string): Promise<void> {
    await AdminUser.findByIdAndUpdate(adminId, {
      $set: { refreshTokens: [] },
    });
  }

  /**
   * Unlock admin account
   */
  async unlockAdmin(adminId: string): Promise<IAdminUser | null> {
    return await AdminUser.findByIdAndUpdate(
      adminId,
      {
        $set: {
          loginAttempts: 0,
          lockedUntil: null,
        },
      },
      { new: true },
    );
  }

  /**
   * Delete admin (soft delete - set status to inactive)
   */
  async deleteAdmin(adminId: string): Promise<void> {
    await AdminUser.findByIdAndUpdate(adminId, {
      status: AdminStatus.INACTIVE,
      refreshTokens: [],
    });
  }

  /**
   * Check if any admin exists (for initial setup)
   */
  async hasAnyAdmin(): Promise<boolean> {
    const count = await AdminUser.countDocuments();
    return count > 0;
  }
}

// Export singleton instance
export const adminUserService = new AdminUserService();

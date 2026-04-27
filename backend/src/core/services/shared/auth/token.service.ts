import { env } from '@core/config/env';
import type { IUser } from '@core/models/User';
import type { AuthTokens, RefreshTokenPayload, TokenPayload } from '@core/types/auth-types';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';

/**
 * Token service - Generate and verify JWT tokens
 */
export class TokenService {
  /**
   * Generate access token (short-lived)
   */
  generateAccessToken(user: IUser, domain?: string): string {
    const payload: TokenPayload = {
      sub: String(user._id),
      firebaseUid: user.firebaseUid,
      email: user.email,
      name: user.name,
      providers: user.authProviders,
      domain,
    };

    return jwt.sign(payload, env.JWT_SECRET, {
      expiresIn: process.env.JWT_ACCESS_TOKEN_EXPIRES || '30d',
    } as jwt.SignOptions);
  }

  /**
   * Generate refresh token (long-lived)
   */
  generateRefreshToken(userId: string): string {
    const tokenId = uuidv4();

    const payload: RefreshTokenPayload = {
      sub: userId,
      type: 'refresh',
      tokenId,
    };

    const refreshSecret = process.env.JWT_REFRESH_SECRET || env.JWT_SECRET;

    return jwt.sign(payload, refreshSecret, {
      expiresIn: process.env.JWT_REFRESH_TOKEN_EXPIRES || '90d',
    } as jwt.SignOptions);
  }

  /**
   * Generate both tokens
   */
  generateTokens(user: IUser, domain?: string): AuthTokens {
    const accessToken = this.generateAccessToken(user, domain);
    const refreshToken = this.generateRefreshToken(String(user._id));

    return {
      accessToken,
      refreshToken,
      expiresIn: 30 * 24 * 60 * 60, // 30 days in seconds
    };
  }

  /**
   * Verify access token
   */
  verifyAccessToken(token: string): TokenPayload {
    try {
      const decoded = jwt.verify(token, env.JWT_SECRET) as TokenPayload;
      return decoded;
    } catch {
      throw new Error('Invalid or expired access token');
    }
  }

  /**
   * Verify refresh token
   */
  verifyRefreshToken(token: string): RefreshTokenPayload {
    try {
      const refreshSecret = process.env.JWT_REFRESH_SECRET || env.JWT_SECRET;
      const decoded = jwt.verify(token, refreshSecret) as RefreshTokenPayload;

      if (decoded.type !== 'refresh') {
        throw new Error('Invalid token type');
      }

      return decoded;
    } catch {
      throw new Error('Invalid or expired refresh token');
    }
  }

  /**
   * Decode token without verification (for debugging)
   */
  decodeToken(token: string): TokenPayload | null {
    try {
      return jwt.decode(token) as TokenPayload;
    } catch {
      return null;
    }
  }

  /**
   * Generate password reset token (expires in 1 hour)
   */
  generatePasswordResetToken(userId: string): string {
    const tokenId = uuidv4();

    const payload = {
      sub: userId,
      type: 'password-reset',
      tokenId,
    };

    return jwt.sign(payload, env.JWT_SECRET, {
      expiresIn: '1h',
    } as jwt.SignOptions);
  }

  /**
   * Verify password reset token
   */
  verifyPasswordResetToken(token: string): { sub: string; type: string; tokenId: string } {
    try {
      const decoded = jwt.verify(token, env.JWT_SECRET) as {
        sub: string;
        type: string;
        tokenId: string;
      };

      if (decoded.type !== 'password-reset') {
        throw new Error('Invalid token type');
      }

      return decoded;
    } catch (_error) {
      throw new Error('Invalid or expired reset token');
    }
  }

  /**
   * Generate email verification token (expires in 24 hours)
   */
  generateEmailVerificationToken(userId: string): string {
    const tokenId = uuidv4();

    const payload = {
      sub: userId,
      type: 'email-verification',
      tokenId,
    };

    return jwt.sign(payload, env.JWT_SECRET, {
      expiresIn: '24h',
    } as jwt.SignOptions);
  }

  /**
   * Verify email verification token
   */
  verifyEmailVerificationToken(token: string): { sub: string; type: string; tokenId: string } {
    try {
      const decoded = jwt.verify(token, env.JWT_SECRET) as {
        sub: string;
        type: string;
        tokenId: string;
      };

      if (decoded.type !== 'email-verification') {
        throw new Error('Invalid token type');
      }

      return decoded;
    } catch (_error) {
      throw new Error('Invalid or expired verification token');
    }
  }
}

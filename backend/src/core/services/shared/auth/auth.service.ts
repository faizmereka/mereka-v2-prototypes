import { verifyFirebaseToken } from '@core/config/firebase';
import { getStripeCountryConfig } from '@core/constants/stripe-countries';
import { HubMember, HubMemberStatus } from '@core/models/HubMember';
import { Otp, OtpPurpose } from '@core/models/Otp';
import { Subscription, SubscriptionStatus } from '@core/models/Subscription';
import { AuthProvider, type IUser, User } from '@core/models/User';
import type { AuthTokens, FirebaseUserInfo } from '@core/types/auth-types';
import type { SharedRegisterInput } from '@schemas/shared';
import { communicationTriggerService } from '@services/communications';
import { PasswordService } from './password.service';
import { TokenService } from './token.service';

const tokenService = new TokenService();
const passwordService = new PasswordService();

/**
 * Authentication service - Main auth logic
 */
export class AuthService {
  // ============================================================================
  // Email Check Methods
  // ============================================================================

  /**
   * Check email status - if user exists and has password
   */
  async checkEmail(email: string): Promise<{
    exists: boolean;
    hasPassword: boolean;
    authProviders: string[];
  }> {
    const normalizedEmail = email.toLowerCase();

    // Find user with password field included
    const user = await User.findOne({ email: normalizedEmail }).select('+password');

    if (!user) {
      return {
        exists: false,
        hasPassword: false,
        authProviders: [],
      };
    }

    return {
      exists: true,
      hasPassword: !!user.password,
      authProviders: user.authProviders,
    };
  }

  /**
   * Setup password for users who don't have one (Firebase migrated users, OTP-only users)
   * This should be called AFTER OTP verification
   */
  async setupPassword(
    email: string,
    newPassword: string,
    ipAddress?: string,
  ): Promise<{ user: IUser; tokens: AuthTokens }> {
    const normalizedEmail = email.toLowerCase();

    // Find user
    const user = await User.findOne({ email: normalizedEmail }).select('+password');

    if (!user) {
      throw new Error('User not found');
    }

    // Check if user already has password
    if (user.password) {
      throw new Error('User already has a password. Use change password instead.');
    }

    // Validate password strength
    const passwordValidation = passwordService.validatePasswordStrength(newPassword);
    if (!passwordValidation.valid) {
      throw new Error(passwordValidation.message || 'Invalid password');
    }

    // Hash and save password
    user.password = await passwordService.hashPassword(newPassword);

    // Add EMAIL provider if not exists
    if (!user.authProviders.includes(AuthProvider.EMAIL)) {
      user.authProviders.push(AuthProvider.EMAIL);
    }

    user.lastLoginAt = new Date();
    user.lastLoginMethod = AuthProvider.EMAIL;
    user.lastLoginIp = ipAddress;
    await user.save();

    // Generate tokens
    const tokens = tokenService.generateTokens(user);

    // Store refresh token
    await this.storeRefreshToken(user, tokens.refreshToken);

    console.log(`\n🔐 Password setup successful for: ${normalizedEmail}\n`);

    return { user, tokens };
  }

  /**
   * Register new user with email and password
   */
  async registerWithEmail(
    data: SharedRegisterInput,
    ipAddress?: string,
  ): Promise<{ user: IUser; tokens: AuthTokens }> {
    // Check if user already exists
    const existingUser = await User.findOne({ email: data.email.toLowerCase() });
    if (existingUser) {
      throw new Error('User with this email already exists');
    }

    // Validate password strength
    const passwordValidation = passwordService.validatePasswordStrength(data.password);
    if (!passwordValidation.valid) {
      throw new Error(passwordValidation.message || 'Invalid password');
    }

    // Hash password
    const hashedPassword = await passwordService.hashPassword(data.password);

    // Parse birth date from dd/mm/yyyy format
    const parts = data.birthDate.split('/');
    if (parts.length !== 3 || !parts[0] || !parts[1] || !parts[2]) {
      throw new Error('Invalid birth date format. Expected dd/mm/yyyy');
    }
    const [day, month, year] = parts;
    const birthDate = new Date(parseInt(year, 10), parseInt(month, 10) - 1, parseInt(day, 10));

    // Create user
    const user = await User.create({
      email: data.email.toLowerCase(),
      name: data.name,
      birthDate,
      password: hashedPassword,
      authProvider: AuthProvider.EMAIL,
      authProviders: [AuthProvider.EMAIL],
      currency: data.currency || 'IDR',
      timeZone: data.timeZone || 'Asia/Jakarta',
      locale: data.locale || 'en',
      emailVerified: false,
      lastLoginAt: new Date(),
      lastLoginMethod: AuthProvider.EMAIL,
      lastLoginIp: ipAddress,
    });

    // Generate tokens
    const tokens = tokenService.generateTokens(user);

    // Store refresh token
    await this.storeRefreshToken(user, tokens.refreshToken);

    // Send welcome notification (non-blocking)
    void this.sendWelcomeNotification(user);

    // Send email verification link (non-blocking)
    void this.sendEmailVerificationLink(user);

    return { user, tokens };
  }

  /**
   * Send welcome notification to new user
   */
  private async sendWelcomeNotification(user: IUser): Promise<void> {
    try {
      await communicationTriggerService.triggerCommunicationWithUser({
        templateId: 'WELCOME_USER',
        user: {
          _id: user._id.toString(),
          name: user.name,
          email: user.email,
          phone: user.phoneNumber,
        },
        data: {
          userName: user.name,
          userEmail: user.email,
          userPhone: user.phoneNumber,
        },
      });
    } catch (error) {
      console.error('Failed to send welcome notification:', error);
    }
  }

  /**
   * Login with email and password
   */
  async loginWithEmail(
    email: string,
    password: string,
    ipAddress?: string,
  ): Promise<{ user: IUser; tokens: AuthTokens }> {
    // Find user by email (include password field)
    const user = await User.findOne({ email: email.toLowerCase() }).select('+password');

    if (!user) {
      throw new Error('Invalid email or password');
    }

    // Check if user has a password (might be social login only)
    if (!user.password) {
      throw new Error('Please login with your social account or reset your password');
    }

    // Verify password
    const isValidPassword = await passwordService.verifyPassword(password, user.password);
    if (!isValidPassword) {
      throw new Error('Invalid email or password');
    }

    // Update last login
    user.lastLoginAt = new Date();
    user.lastLoginMethod = AuthProvider.EMAIL;
    user.lastLoginIp = ipAddress;
    await user.save();

    // Generate tokens
    const tokens = tokenService.generateTokens(user);

    // Store refresh token
    await this.storeRefreshToken(user, tokens.refreshToken);

    // Send login success notification (non-blocking)
    void this.sendLoginSuccessNotification(user, 'email', ipAddress);

    return { user, tokens };
  }

  /**
   * Login with Firebase token (for social sign-in)
   * Verifies Firebase token, syncs user to MongoDB, returns custom JWT
   */
  async loginWithFirebase(
    firebaseToken: string,
    domain?: string,
    ipAddress?: string,
  ): Promise<{ user: IUser; tokens: AuthTokens }> {
    // 1. Verify Firebase token
    const decodedToken = await verifyFirebaseToken(firebaseToken);

    // 2. Extract user info from Firebase token
    // Firebase token has dynamic structure, using type assertion
    const firebaseUser: FirebaseUserInfo = {
      uid: decodedToken.uid,
      email: String(decodedToken.email || ''),
      emailVerified: Boolean(decodedToken.email_verified),
      displayName: decodedToken.name as string | undefined,
      photoURL: decodedToken.picture as string | undefined,
      phoneNumber: decodedToken.phone_number as string | undefined,
      provider: String(
        (decodedToken.firebase as { sign_in_provider?: string })?.sign_in_provider || 'firebase',
      ),
    };

    // 3. Sync user to MongoDB (create or update)
    const user = await this.syncUser(firebaseUser, ipAddress);

    // 4. Generate custom JWT tokens
    const tokens = tokenService.generateTokens(user, domain);

    // 5. Store refresh token
    await this.storeRefreshToken(user, tokens.refreshToken);

    // Send login success notification (non-blocking)
    const provider = this.getAuthProviderFromFirebase(
      String(
        (decodedToken.firebase as { sign_in_provider?: string })?.sign_in_provider || 'firebase',
      ),
    );
    void this.sendLoginSuccessNotification(user, provider, ipAddress);

    return { user, tokens };
  }

  /**
   * Sync Firebase user to MongoDB
   */
  private async syncUser(firebaseUser: FirebaseUserInfo, ipAddress?: string): Promise<IUser> {
    // Try to find existing user by Firebase UID or email
    let user = await User.findOne({
      $or: [{ firebaseUid: firebaseUser.uid }, { email: firebaseUser.email }],
    });

    if (user) {
      // Update existing user
      user.firebaseUid = firebaseUser.uid;
      user.name = firebaseUser.displayName || user.name;
      user.emailVerified = firebaseUser.emailVerified;
      user.profilePhoto = firebaseUser.photoURL || user.profilePhoto;
      user.phoneNumber = firebaseUser.phoneNumber || user.phoneNumber;
      user.lastLoginAt = new Date();
      user.lastLoginMethod = this.getAuthProviderFromFirebase(firebaseUser.provider);
      user.lastLoginIp = ipAddress;

      // Add provider if not already in list
      const provider = this.getAuthProviderFromFirebase(firebaseUser.provider);
      if (!user.authProviders.includes(provider)) {
        user.authProviders.push(provider);
      }

      await user.save();
    } else {
      // Create new user
      user = await User.create({
        email: firebaseUser.email,
        name: firebaseUser.displayName || firebaseUser.email.split('@')[0] || 'User',
        firebaseUid: firebaseUser.uid,
        emailVerified: firebaseUser.emailVerified,
        profilePhoto: firebaseUser.photoURL,
        phoneNumber: firebaseUser.phoneNumber,
        authProviders: [this.getAuthProviderFromFirebase(firebaseUser.provider)],
        lastLoginAt: new Date(),
        lastLoginMethod: this.getAuthProviderFromFirebase(firebaseUser.provider),
        lastLoginIp: ipAddress,
      });
    }

    return user;
  }

  /**
   * Map Firebase provider to AuthProvider enum
   */
  private getAuthProviderFromFirebase(firebaseProvider: string): AuthProvider {
    const providerMap: Record<string, AuthProvider> = {
      'google.com': AuthProvider.GOOGLE,
      'facebook.com': AuthProvider.FACEBOOK,
      password: AuthProvider.EMAIL,
      firebase: AuthProvider.FIREBASE,
    };

    return providerMap[firebaseProvider] || AuthProvider.FIREBASE;
  }

  /**
   * Store refresh token in user document
   */
  private async storeRefreshToken(user: IUser, refreshToken: string): Promise<void> {
    // Add refresh token to user's list (max 5 tokens)
    const refreshTokens = user.refreshTokens || [];
    refreshTokens.push(refreshToken);

    // Keep only last 5 tokens
    if (refreshTokens.length > 5) {
      refreshTokens.shift();
    }

    await User.findByIdAndUpdate(user._id, { refreshTokens });
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshAccessToken(refreshToken: string): Promise<AuthTokens> {
    // 1. Verify refresh token
    const decoded = tokenService.verifyRefreshToken(refreshToken);

    // 2. Check if token is in user's valid tokens
    const user = await User.findById(decoded.sub).select('+refreshTokens');

    if (!user) {
      throw new Error('User not found');
    }

    if (!user.refreshTokens?.includes(refreshToken)) {
      throw new Error('Invalid refresh token');
    }

    // 3. Generate new tokens
    const tokens = tokenService.generateTokens(user);

    // 4. Replace old refresh token with new one
    // Note: Cannot use $pull and $push on same field in one update, so we update the array manually
    const updatedTokens = (user.refreshTokens || []).filter((t) => t !== refreshToken);
    updatedTokens.push(tokens.refreshToken);

    // Keep only last 5 tokens
    const finalTokens = updatedTokens.length > 5 ? updatedTokens.slice(-5) : updatedTokens;

    await User.findByIdAndUpdate(user._id, {
      $set: { refreshTokens: finalTokens },
    });

    return tokens;
  }

  /**
   * Logout - revoke refresh token
   */
  async logout(userId: string, refreshToken?: string): Promise<void> {
    if (refreshToken) {
      // Remove specific refresh token
      await User.findByIdAndUpdate(userId, {
        $pull: { refreshTokens: refreshToken },
      });
    } else {
      // Remove all refresh tokens (logout from all devices)
      await User.findByIdAndUpdate(userId, {
        $set: { refreshTokens: [] },
      });
    }
  }

  /**
   * Get user from token payload (used by /me endpoint)
   */
  async getUserFromToken(userId: string): Promise<IUser | null> {
    const user = await User.findById(userId);
    return user;
  }

  /**
   * Change password for logged-in user
   */
  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ): Promise<void> {
    // Get user with password field
    const user = await User.findById(userId).select('+password');

    if (!user) {
      throw new Error('User not found');
    }

    // Check if user has a password (might be social login only)
    if (!user.password) {
      throw new Error('Cannot change password for social login accounts');
    }

    // Verify current password
    const isValidPassword = await passwordService.verifyPassword(currentPassword, user.password);
    if (!isValidPassword) {
      throw new Error('Current password is incorrect');
    }

    // Validate new password strength
    const passwordValidation = passwordService.validatePasswordStrength(newPassword);
    if (!passwordValidation.valid) {
      throw new Error(passwordValidation.message || 'Invalid password');
    }

    // Hash and save new password
    user.password = await passwordService.hashPassword(newPassword);
    await user.save();

    // Send password changed notification
    void this.sendPasswordChangedNotification(user);
  }

  /**
   * Send password changed notification
   */
  private async sendPasswordChangedNotification(user: IUser): Promise<void> {
    try {
      await communicationTriggerService.triggerCommunicationWithUser({
        templateId: 'PASSWORD_CHANGED',
        user: {
          _id: user._id.toString(),
          name: user.name,
          email: user.email,
          phone: user.phoneNumber,
        },
        data: {
          userName: user.name,
          userEmail: user.email,
          changeDate: new Date().toISOString(),
        },
      });
    } catch (error) {
      console.error('Failed to send password changed notification:', error);
    }
  }

  /**
   * Request password reset (forgot password)
   */
  async requestPasswordReset(email: string): Promise<{ resetToken: string; resetLink: string }> {
    const user = await User.findOne({ email: email.toLowerCase() });

    // Get auth URL from environment
    const authUrl = process.env.AUTH_URL || 'https://auth.mereka.io';

    if (!user) {
      // For security, don't reveal if user exists
      // Return fake token (won't be stored)
      const fakeToken = tokenService.generateRefreshToken('fake-id');
      return {
        resetToken: fakeToken,
        resetLink: `${authUrl}/reset-password?token=${fakeToken}`,
      };
    }

    // Generate reset token (expires in 1 hour)
    const resetToken = tokenService.generatePasswordResetToken(user._id.toString());

    // Store reset token in user document (for verification later)
    user.passwordResetToken = resetToken;
    user.passwordResetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    await user.save();

    const resetLink = `${authUrl}/reset-password?token=${resetToken}`;

    // Send password reset email notification
    void this.sendPasswordResetNotification(user, resetLink);

    console.log('\n🔐 PASSWORD RESET REQUEST');
    console.log(`Email: ${email}`);
    console.log(`Reset Link: ${resetLink}`);
    console.log('Valid for: 1 hour\n');

    return { resetToken, resetLink };
  }

  /**
   * Send password reset link notification
   */
  private async sendPasswordResetNotification(user: IUser, resetLink: string): Promise<void> {
    try {
      await communicationTriggerService.triggerCommunicationWithUser({
        templateId: 'PASSWORD_RESET_LINK',
        user: {
          _id: user._id.toString(),
          name: user.name,
          email: user.email,
          phone: user.phoneNumber,
        },
        data: {
          userName: user.name,
          userEmail: user.email,
          resetLink,
          expiryMinutes: 60,
        },
        channels: ['email'], // Password reset is email-only
      });
    } catch (error) {
      console.error('Failed to send password reset notification:', error);
    }
  }

  /**
   * Reset password with token
   */
  async resetPasswordWithToken(token: string, newPassword: string): Promise<void> {
    // Verify token
    const decoded = tokenService.verifyPasswordResetToken(token);

    // Find user with valid reset token
    const user = await User.findOne({
      _id: decoded.sub,
      passwordResetToken: token,
      passwordResetExpires: { $gt: new Date() },
    }).select('+password');

    if (!user) {
      throw new Error('Invalid or expired reset token');
    }

    // Validate new password strength
    const passwordValidation = passwordService.validatePasswordStrength(newPassword);
    if (!passwordValidation.valid) {
      throw new Error(passwordValidation.message || 'Invalid password');
    }

    // Hash and save new password
    user.password = await passwordService.hashPassword(newPassword);
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();

    // Send password reset success notification
    void this.sendPasswordResetSuccessNotification(user);

    console.log(`\n✅ Password reset successful for user: ${user.email}\n`);
  }

  /**
   * Send password reset success notification
   */
  private async sendPasswordResetSuccessNotification(user: IUser): Promise<void> {
    try {
      await communicationTriggerService.triggerCommunicationWithUser({
        templateId: 'PASSWORD_RESET_SUCCESS',
        user: {
          _id: user._id.toString(),
          name: user.name,
          email: user.email,
          phone: user.phoneNumber,
        },
        data: {
          userName: user.name,
          userEmail: user.email,
        },
      });
    } catch (error) {
      console.error('Failed to send password reset success notification:', error);
    }
  }

  /**
   * Send login success notification
   * Tracks successful logins for security awareness
   */
  private async sendLoginSuccessNotification(
    user: IUser,
    loginMethod: string,
    ipAddress?: string,
  ): Promise<void> {
    try {
      // Format login time for display
      const loginTime = new Date().toLocaleString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZoneName: 'short',
      });

      // Create device info string from login method and IP
      const deviceInfo = ipAddress ? `${loginMethod} (IP: ${ipAddress})` : loginMethod;

      await communicationTriggerService.triggerCommunicationWithUser({
        templateId: 'LOGIN_SUCCESS',
        user: {
          _id: user._id.toString(),
          name: user.name,
          email: user.email,
          phone: user.phoneNumber,
        },
        data: {
          userName: user.name,
          userEmail: user.email,
          loginMethod,
          deviceInfo,
          loginTime,
          ipAddress: ipAddress || 'Unknown',
        },
      });
    } catch (error) {
      console.error('Failed to send login success notification:', error);
    }
  }

  // ============================================================================
  // Email Verification Methods
  // ============================================================================

  /**
   * Send email verification link to user
   * Generates a JWT token and sends an email with the verification link
   */
  async sendEmailVerificationLink(user: IUser): Promise<void> {
    try {
      // Don't send if already verified
      if (user.emailVerified) {
        return;
      }

      // Generate verification token
      const token = tokenService.generateEmailVerificationToken(user._id.toString());

      // Build verification URL (auth frontend)
      const authUrl = process.env.AUTH_URL || 'https://auth.mereka.io';
      const verificationLink = `${authUrl}/verify-email?token=${token}`;

      // Send email verification notification
      await communicationTriggerService.triggerCommunicationWithUser({
        templateId: 'EMAIL_VERIFICATION',
        user: {
          _id: user._id.toString(),
          name: user.name,
          email: user.email,
          phone: user.phoneNumber,
        },
        data: {
          userName: user.name,
          userEmail: user.email,
          verificationLink,
          expiryHours: 24,
        },
        channels: ['email'], // Email only for verification
      });

      console.log('\n📧 EMAIL VERIFICATION LINK SENT');
      console.log(`Email: ${user.email}`);
      console.log(`Link: ${verificationLink}`);
      console.log('Valid for: 24 hours\n');
    } catch (error) {
      console.error('Failed to send email verification link:', error);
    }
  }

  /**
   * Verify email with token from verification link
   * Sets emailVerified = true on success
   */
  async verifyEmailWithToken(token: string): Promise<{ success: boolean; message: string }> {
    try {
      // Verify the token
      const decoded = tokenService.verifyEmailVerificationToken(token);

      // Find and update user
      const user = await User.findById(decoded.sub);

      if (!user) {
        throw new Error('User not found');
      }

      if (user.emailVerified) {
        return { success: true, message: 'Email already verified' };
      }

      // Update emailVerified status
      user.emailVerified = true;
      await user.save();

      console.log(`\n✅ Email verified for user: ${user.email}\n`);

      return { success: true, message: 'Email verified successfully' };
    } catch (error) {
      console.error('Email verification failed:', error);
      throw new Error(
        error instanceof Error ? error.message : 'Invalid or expired verification link',
      );
    }
  }

  /**
   * Resend email verification link
   * Called by authenticated user who hasn't verified their email
   */
  async resendVerificationEmail(userId: string): Promise<{ success: boolean; message: string }> {
    const user = await User.findById(userId);

    if (!user) {
      throw new Error('User not found');
    }

    if (user.emailVerified) {
      return { success: true, message: 'Email already verified' };
    }

    // Send the verification link
    await this.sendEmailVerificationLink(user);

    return { success: true, message: 'Verification email sent' };
  }

  // ============================================================================
  // OTP (One-Time Password) Methods
  // ============================================================================

  /**
   * Send OTP to user's email for passwordless login
   * - Generates a secure 6-digit OTP
   * - Stores hashed OTP in database with expiry
   * - Rate limits: max 3 active OTPs per email
   */
  async sendOtp(email: string): Promise<{ message: string; expiresIn: number; otp: string }> {
    const normalizedEmail = email.toLowerCase();
    const OTP_EXPIRY_MINUTES = 10;
    const MAX_ACTIVE_OTPS = 3;

    // Rate limiting: Check active OTPs for this email
    const activeOtpCount = await Otp.countDocuments({
      email: normalizedEmail,
      purpose: OtpPurpose.LOGIN,
      expiresAt: { $gt: new Date() },
    });

    if (activeOtpCount >= MAX_ACTIVE_OTPS) {
      throw new Error('Too many OTP requests. Please wait a few minutes before trying again.');
    }

    // Generate OTP
    const otp = Otp.generateOtp();
    const otpHash = Otp.hashOtp(otp);

    // Store hashed OTP
    await Otp.create({
      email: normalizedEmail,
      otpHash,
      purpose: OtpPurpose.LOGIN,
      expiresAt: new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000),
    });

    // Send OTP notification via email and whatsApp (if user exists with phone)
    void this.sendOtpNotification(normalizedEmail, otp, OTP_EXPIRY_MINUTES);

    console.log('\n📧 OTP LOGIN REQUEST');
    console.log(`Email: ${normalizedEmail}`);
    console.log(`OTP: ${otp}`);
    console.log(`Valid for: ${OTP_EXPIRY_MINUTES} minutes\n`);

    return {
      message: 'OTP sent successfully',
      expiresIn: OTP_EXPIRY_MINUTES * 60, // in seconds
      otp, // TODO: Remove in production - only for testing
    };
  }

  /**
   * Send OTP notification via email and WhatsApp
   */
  private async sendOtpNotification(
    email: string,
    otp: string,
    expiryMinutes: number,
  ): Promise<void> {
    try {
      // Check if user exists to get phone number
      const user = await User.findOne({ email }).select('name email phone').lean();

      if (user) {
        await communicationTriggerService.triggerCommunicationWithUser({
          templateId: 'OTP_LOGIN_CODE',
          user: {
            _id: user._id.toString(),
            name: user.name,
            email: user.email,
            phone: user.phoneNumber,
          },
          data: {
            userName: user.name || email.split('@')[0],
            userEmail: email,
            userPhone: user.phoneNumber,
            otpCode: otp,
            expiryMinutes,
          },
        });
      } else {
        // New user - send email only using userId as placeholder
        await communicationTriggerService.triggerCommunication({
          templateId: 'OTP_LOGIN_CODE',
          userId: 'new-user', // Placeholder for new users
          data: {
            userName: email.split('@')[0],
            userEmail: email,
            otpCode: otp,
            expiryMinutes,
          },
          channels: ['email'], // Only email for new users
        });
      }
    } catch (error) {
      console.error('Failed to send OTP notification:', error);
    }
  }

  /**
   * Verify OTP and login user
   * - Validates OTP against stored hash
   * - Creates user if not exists (guest signup)
   * - Returns user and tokens on success
   */
  async verifyOtp(
    email: string,
    otp: string,
    ipAddress?: string,
  ): Promise<{ user: IUser; tokens: AuthTokens }> {
    const normalizedEmail = email.toLowerCase();

    // Find valid OTP
    const otpRecord = await Otp.findOne({
      email: normalizedEmail,
      purpose: OtpPurpose.LOGIN,
      expiresAt: { $gt: new Date() },
    }).sort({ createdAt: -1 }); // Get most recent

    if (!otpRecord) {
      throw new Error('Invalid or expired OTP. Please request a new one.');
    }

    // Check max attempts
    if (otpRecord.attempts >= otpRecord.maxAttempts) {
      await Otp.deleteOne({ _id: otpRecord._id });
      throw new Error('Too many failed attempts. Please request a new OTP.');
    }

    // Verify OTP
    const isValid = otpRecord.verifyOtp(otp);

    if (!isValid) {
      // Increment attempts
      otpRecord.attempts += 1;
      await otpRecord.save();

      const remainingAttempts = otpRecord.maxAttempts - otpRecord.attempts;
      throw new Error(
        `Invalid OTP. ${remainingAttempts} attempt${remainingAttempts !== 1 ? 's' : ''} remaining.`,
      );
    }

    // OTP verified - delete all OTPs for this email
    await Otp.deleteMany({
      email: normalizedEmail,
      purpose: OtpPurpose.LOGIN,
    });

    // Find or create user
    let user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      // Create new user (guest signup via OTP)
      user = await User.create({
        email: normalizedEmail,
        name: normalizedEmail.split('@')[0] || 'User',
        emailVerified: true, // Email is verified since they received OTP
        authProviders: [AuthProvider.EMAIL],
        isGuestSignup: true,
        lastLoginAt: new Date(),
        lastLoginMethod: AuthProvider.EMAIL,
        lastLoginIp: ipAddress,
      });

      console.log(`\n✨ New user created via OTP: ${normalizedEmail}\n`);
    } else {
      // Update existing user
      user.emailVerified = true;
      user.lastLoginAt = new Date();
      user.lastLoginMethod = AuthProvider.EMAIL;
      user.lastLoginIp = ipAddress;

      // Add EMAIL provider if not exists
      if (!user.authProviders.includes(AuthProvider.EMAIL)) {
        user.authProviders.push(AuthProvider.EMAIL);
      }

      await user.save();
    }

    // Generate tokens
    const tokens = tokenService.generateTokens(user);

    // Store refresh token
    await this.storeRefreshToken(user, tokens.refreshToken);

    console.log(`\n✅ OTP login successful for: ${normalizedEmail}\n`);

    return { user, tokens };
  }

  // ============================================================================
  // Hub Methods
  // ============================================================================

  /**
   * Get user's hubs from HubMember collection
   * Returns array of hubs with id, name, and logo
   */
  async getUserHubs(userId: string): Promise<
    Array<{
      hubId: string;
      hubName: string;
      hubLogo: string | null;
      hubSlug: string;
      hubCurrency: string;
      stripeAccountId?: string | null;
    }>
  > {
    const memberships = await HubMember.find({
      userId,
      status: HubMemberStatus.ACTIVE,
    })
      .populate('hubId', 'name logo slug location currency stripeAccountId')
      .lean();

    return memberships.map((membership) => {
      const hub = membership.hubId as unknown as {
        _id: string;
        name: string;
        logo?: string;
        slug?: string;
        currency?: string;
        stripeAccountId?: string;
        location?: {
          address?: string;
          city?: string;
          state?: string;
          country?: string;
          postcode?: string;
          lat?: number;
          lng?: number;
        };
      };
      return {
        hubId: String(hub._id),
        hubName: hub.name,
        hubLogo: hub.logo || null,
        hubSlug: hub.slug || '',
        hubLocation: hub.location || null,
        hubCurrency:
          hub.currency || getStripeCountryConfig(hub.location?.country)?.currency || 'MYR',
        stripeAccountId: hub.stripeAccountId || null,
      };
    });
  }

  /**
   * Get user's membership for a specific hub with roles and permissions
   */
  async getHubMembershipWithPermissions(
    userId: string,
    hubId: string,
  ): Promise<{
    hub: {
      id: string;
      name: string;
      logo: string | null;
      slug: string;
      location: {
        address?: string;
        city?: string;
        state?: string;
        country?: string;
        postcode?: string;
        lat?: number;
        lng?: number;
      } | null;
      currency: string;
    };
    roles: Array<{ key: string; name: string }>;
    permissions: string[];
  } | null> {
    const membership = await HubMember.findOne({
      userId,
      hubId,
      status: HubMemberStatus.ACTIVE,
    })
      .populate('hubId', 'name logo slug location currency')
      .populate({
        path: 'roleIds',
        select: 'key name permissions',
        populate: {
          path: 'permissions',
          select: 'key',
        },
      })
      .lean();

    if (!membership) {
      return null;
    }

    const hub = membership.hubId as unknown as {
      _id: string;
      name: string;
      logo?: string;
      slug?: string;
      currency?: string;
      location?: {
        address?: string;
        city?: string;
        state?: string;
        country?: string;
        postcode?: string;
        lat?: number;
        lng?: number;
      };
    };

    const roles = (
      membership.roleIds as unknown as Array<{
        key: string;
        name: string;
        permissions: Array<{ key: string }>;
      }>
    ).map((role) => ({
      key: role.key,
      name: role.name,
    }));

    // Use custom permissions if set, otherwise collect from roles
    let permissions: string[];

    if (membership.permissions && membership.permissions.length > 0) {
      // Custom permissions override role permissions
      permissions = membership.permissions;
    } else {
      // Collect unique permission keys from all roles
      const permissionSet = new Set<string>();
      (
        membership.roleIds as unknown as Array<{
          permissions: Array<{ key: string }>;
        }>
      ).forEach((role) => {
        role.permissions?.forEach((permission) => {
          permissionSet.add(permission.key);
        });
      });
      permissions = Array.from(permissionSet);
    }

    return {
      hub: {
        id: String(hub._id),
        name: hub.name,
        logo: hub.logo || null,
        slug: hub.slug || '',
        location: hub.location || null,
        currency: hub.currency || getStripeCountryConfig(hub.location?.country)?.currency || 'MYR',
      },
      roles,
      permissions,
    };
  }

  /**
   * Get all user's hubs with their roles and permissions
   * Used when includePermissions=true without a specific hubId
   */
  async getAllHubsWithPermissions(
    userId: string,
    includeSubscription = false,
  ): Promise<
    Array<{
      hubId: string;
      hubName: string;
      hubLogo: string | null;
      hubSlug: string;
      hubLocation: {
        address?: string;
        city?: string;
        state?: string;
        country?: string;
        postcode?: string;
        lat?: number;
        lng?: number;
      } | null;
      hubCurrency: string;
      stripeAccountId?: string | null;
      roles: Array<{ key: string; name: string }>;
      permissions: string[];
      subscription?: {
        hasActiveSubscription: boolean;
        requiresPlanSelection: boolean;
        planCode?: string;
        planName?: string;
        status?: string;
      };
    }>
  > {
    const memberships = await HubMember.find({
      userId,
      status: HubMemberStatus.ACTIVE,
    })
      .populate('hubId', 'name logo slug location currency stripeAccountId')
      .populate({
        path: 'roleIds',
        select: 'key name permissions',
        populate: {
          path: 'permissions',
          select: 'key',
        },
      })
      .lean();

    // Get all hub IDs for subscription lookup
    const hubIds = memberships.map((m) => {
      const hub = m.hubId as unknown as { _id: string };
      return String(hub._id);
    });

    // Fetch subscriptions for all hubs if requested
    let subscriptionMap: Map<string, { planCode: string; status: string }> = new Map();

    if (includeSubscription && hubIds.length > 0) {
      const subscriptions = await Subscription.find({
        hubId: { $in: hubIds },
        status: {
          $in: [
            SubscriptionStatus.ACTIVE,
            SubscriptionStatus.TRIALING,
            SubscriptionStatus.PAST_DUE,
          ],
        },
      })
        .select('hubId planCode status')
        .lean();

      subscriptionMap = new Map(
        subscriptions.map((sub) => [
          String(sub.hubId),
          { planCode: sub.planCode, status: sub.status },
        ]),
      );
    }

    return memberships.map((membership) => {
      const hub = membership.hubId as unknown as {
        _id: string;
        name: string;
        logo?: string;
        slug?: string;
        currency?: string;
        stripeAccountId?: string;
        location?: {
          address?: string;
          city?: string;
          state?: string;
          country?: string;
          postcode?: string;
          lat?: number;
          lng?: number;
        };
      };

      const roles = (
        membership.roleIds as unknown as Array<{
          key: string;
          name: string;
          permissions: Array<{ key: string }>;
        }>
      ).map((role) => ({
        key: role.key,
        name: role.name,
      }));

      // Use custom permissions if set, otherwise collect from roles
      let permissions: string[];

      if (membership.permissions && membership.permissions.length > 0) {
        // Custom permissions override role permissions
        permissions = membership.permissions;
      } else {
        // Collect unique permission keys from all roles
        const permissionSet = new Set<string>();
        (
          membership.roleIds as unknown as Array<{
            permissions: Array<{ key: string }>;
          }>
        ).forEach((role) => {
          role.permissions?.forEach((permission) => {
            permissionSet.add(permission.key);
          });
        });
        permissions = Array.from(permissionSet);
      }

      const hubId = String(hub._id);
      const result: {
        hubId: string;
        hubName: string;
        hubLogo: string | null;
        hubSlug: string;
        hubLocation: {
          address?: string;
          city?: string;
          state?: string;
          country?: string;
          postcode?: string;
          lat?: number;
          lng?: number;
        } | null;
        hubCurrency: string;
        stripeAccountId?: string | null;
        roles: typeof roles;
        permissions: string[];
        subscription?: {
          hasActiveSubscription: boolean;
          requiresPlanSelection: boolean;
          planCode?: string;
          planName?: string;
          status?: string;
        };
      } = {
        hubId,
        hubName: hub.name,
        hubLogo: hub.logo || null,
        hubSlug: hub.slug || '',
        hubLocation: hub.location || null,
        hubCurrency:
          hub.currency || getStripeCountryConfig(hub.location?.country)?.currency || 'MYR',
        stripeAccountId: hub.stripeAccountId || null,
        roles,
        permissions,
      };

      // Add subscription info if requested
      if (includeSubscription) {
        const sub = subscriptionMap.get(hubId);
        result.subscription = {
          hasActiveSubscription: !!sub,
          requiresPlanSelection: !sub,
          planCode: sub?.planCode,
          status: sub?.status,
        };
      }

      return result;
    });
  }
}

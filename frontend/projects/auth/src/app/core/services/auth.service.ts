import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';

// ============================================================================
// API Response Types
// ============================================================================

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: {
    code: string;
    message: string;
  };
}

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  emailVerified: boolean;
  profilePhoto?: string;
  authProviders: string[];
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface LoginResponse {
  user: AuthUser;
  tokens: AuthTokens;
}

export interface RegisterResponse {
  user: AuthUser;
  tokens: AuthTokens;
}

// ============================================================================
// Request Types
// ============================================================================

export interface LoginRequest {
  email: string;
  password: string;
}

export interface SocialLoginRequest {
  firebaseToken: string;
  domain?: string;
}

export interface RegisterRequest {
  name: string;
  email: string;
  birthDate: string; // dd/mm/yyyy format
  password: string;
  confirmPassword: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  token: string;
  newPassword: string;
}

export interface SendOtpRequest {
  email: string;
}

export interface VerifyOtpRequest {
  email: string;
  otp: string;
}

export interface CheckEmailResponse {
  exists: boolean;
  hasPassword: boolean;
  authProviders: string[];
}

export interface SetupPasswordRequest {
  email: string;
  password: string;
  confirmPassword: string;
}

// ============================================================================
// Error Types
// ============================================================================

export type AuthErrorCode =
  | 'LOGIN_FAILED'
  | 'USER_ALREADY_EXISTS'
  | 'REGISTRATION_FAILED'
  | 'FORGOT_PASSWORD_FAILED'
  | 'RESET_PASSWORD_FAILED'
  | 'TOKEN_REFRESH_FAILED'
  | 'NETWORK_ERROR'
  | 'UNKNOWN_ERROR';

export class AuthError extends Error {
  constructor(
    public code: AuthErrorCode,
    message: string
  ) {
    super(message);
    this.name = 'AuthError';
  }
}

// ============================================================================
// Auth Service
// ============================================================================

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  /**
   * Login with email and password
   */
  async login(email: string, password: string): Promise<LoginResponse> {
    const url = `${this.apiUrl}/auth/login`;
    const body: LoginRequest = { email, password };

    try {
      const response = await firstValueFrom(
        this.http.post<ApiResponse<LoginResponse>>(url, body, {
          withCredentials: true, // Include cookies
        })
      );

      if (!response.success || !response.data) {
        throw new AuthError('LOGIN_FAILED', response.error?.message || 'Login failed');
      }

      return response.data;
    } catch (error) {
      throw this.handleError(error, 'LOGIN_FAILED');
    }
  }

  /**
   * Login with Firebase token (social auth)
   */
  async loginSocial(firebaseToken: string): Promise<LoginResponse> {
    const url = `${this.apiUrl}/auth/login/social`;
    const body: SocialLoginRequest = {
      firebaseToken,
      domain: window.location.hostname,
    };

    try {
      const response = await firstValueFrom(
        this.http.post<ApiResponse<LoginResponse>>(url, body, {
          withCredentials: true,
        })
      );

      if (!response.success || !response.data) {
        throw new AuthError('LOGIN_FAILED', response.error?.message || 'Social login failed');
      }

      return response.data;
    } catch (error) {
      throw this.handleError(error, 'LOGIN_FAILED');
    }
  }

  /**
   * Register new user with email and password
   */
  async register(data: {
    name: string;
    email: string;
    birthDate: Date;
    password: string;
    confirmPassword: string;
  }): Promise<RegisterResponse> {
    const url = `${this.apiUrl}/auth/register`;

    // Format birthDate as dd/mm/yyyy
    const formattedBirthDate = this.formatBirthDate(data.birthDate);

    const body: RegisterRequest = {
      name: data.name,
      email: data.email,
      birthDate: formattedBirthDate,
      password: data.password,
      confirmPassword: data.confirmPassword,
    };

    try {
      const response = await firstValueFrom(
        this.http.post<ApiResponse<RegisterResponse>>(url, body, {
          withCredentials: true,
        })
      );

      if (!response.success || !response.data) {
        throw new AuthError(
          'REGISTRATION_FAILED',
          response.error?.message || 'Registration failed'
        );
      }

      return response.data;
    } catch (error) {
      if (error instanceof AuthError) throw error;

      const httpError = error as HttpErrorResponse;
      if (httpError.status === 409) {
        throw new AuthError('USER_ALREADY_EXISTS', 'An account with this email already exists');
      }

      throw this.handleError(error, 'REGISTRATION_FAILED');
    }
  }

  /**
   * Request password reset email
   */
  async forgotPassword(email: string): Promise<void> {
    const url = `${this.apiUrl}/auth/forgot-password`;
    const body: ForgotPasswordRequest = { email };

    try {
      const response = await firstValueFrom(
        this.http.post<ApiResponse<void>>(url, body)
      );

      if (!response.success) {
        throw new AuthError(
          'FORGOT_PASSWORD_FAILED',
          response.error?.message || 'Failed to send reset email'
        );
      }
    } catch (error) {
      throw this.handleError(error, 'FORGOT_PASSWORD_FAILED');
    }
  }

  /**
   * Reset password with token
   */
  async resetPassword(token: string, newPassword: string): Promise<void> {
    const url = `${this.apiUrl}/auth/reset-password`;
    const body: ResetPasswordRequest = { token, newPassword };

    try {
      const response = await firstValueFrom(
        this.http.post<ApiResponse<void>>(url, body)
      );

      if (!response.success) {
        throw new AuthError(
          'RESET_PASSWORD_FAILED',
          response.error?.message || 'Failed to reset password'
        );
      }
    } catch (error) {
      throw this.handleError(error, 'RESET_PASSWORD_FAILED');
    }
  }

  /**
   * Refresh access token using cookie-based refresh token
   * Called by HTTP interceptor when access token expires
   * Returns true if refresh succeeded, false if both tokens expired
   */
  async refreshAccessToken(): Promise<boolean> {
    const url = `${this.apiUrl}/auth/refresh`;

    try {
      const response = await firstValueFrom(
        this.http.post<ApiResponse<{ tokens: AuthTokens }>>(url, {}, {
          withCredentials: true,
        })
      );

      return response?.success || false;
    } catch {
      return false;
    }
  }

  /**
   * Refresh access token (legacy - with explicit refresh token parameter)
   */
  async refreshToken(refreshToken: string): Promise<AuthTokens> {
    const url = `${this.apiUrl}/auth/refresh`;
    const body = { refreshToken };

    try {
      const response = await firstValueFrom(
        this.http.post<ApiResponse<{ tokens: AuthTokens }>>(url, body, {
          withCredentials: true,
        })
      );

      if (!response.success || !response.data) {
        throw new AuthError(
          'TOKEN_REFRESH_FAILED',
          response.error?.message || 'Failed to refresh token'
        );
      }

      return response.data.tokens;
    } catch (error) {
      throw this.handleError(error, 'TOKEN_REFRESH_FAILED');
    }
  }

  /**
   * Get current authenticated user
   * Returns null if not authenticated
   */
  async getMe(): Promise<AuthUser | null> {
    const url = `${this.apiUrl}/auth/me`;

    try {
      const response = await firstValueFrom(
        this.http.get<ApiResponse<AuthUser>>(url, {
          withCredentials: true,
        })
      );

      if (!response.success || !response.data) {
        return null;
      }

      return response.data;
    } catch {
      return null;
    }
  }

  /**
   * Send OTP to email for passwordless login
   */
  async sendOtp(email: string): Promise<void> {
    const url = `${this.apiUrl}/auth/otp/send`;
    const body: SendOtpRequest = { email };

    try {
      const response = await firstValueFrom(
        this.http.post<ApiResponse<void>>(url, body)
      );

      if (!response.success) {
        throw new AuthError(
          'UNKNOWN_ERROR',
          response.error?.message || 'Failed to send OTP'
        );
      }
    } catch (error) {
      throw this.handleError(error, 'UNKNOWN_ERROR');
    }
  }

  /**
   * Verify OTP and login
   */
  async verifyOtp(email: string, otp: string): Promise<LoginResponse> {
    const url = `${this.apiUrl}/auth/otp/verify`;
    const body: VerifyOtpRequest = { email, otp };

    try {
      const response = await firstValueFrom(
        this.http.post<ApiResponse<LoginResponse>>(url, body, {
          withCredentials: true,
        })
      );

      if (!response.success || !response.data) {
        throw new AuthError(
          'LOGIN_FAILED',
          response.error?.message || 'Invalid OTP'
        );
      }

      return response.data;
    } catch (error) {
      throw this.handleError(error, 'LOGIN_FAILED');
    }
  }

  /**
   * Check email status - if user exists and has password
   */
  async checkEmail(email: string): Promise<CheckEmailResponse> {
    const url = `${this.apiUrl}/auth/check-email?email=${encodeURIComponent(email)}`;

    try {
      const response = await firstValueFrom(
        this.http.get<ApiResponse<CheckEmailResponse>>(url)
      );

      if (!response.success || !response.data) {
        throw new AuthError(
          'UNKNOWN_ERROR',
          response.error?.message || 'Failed to check email'
        );
      }

      return response.data;
    } catch (error) {
      throw this.handleError(error, 'UNKNOWN_ERROR');
    }
  }

  /**
   * Setup password for users without one (after OTP verification)
   */
  async setupPassword(email: string, password: string, confirmPassword: string): Promise<LoginResponse> {
    const url = `${this.apiUrl}/auth/setup-password`;
    const body: SetupPasswordRequest = { email, password, confirmPassword };

    try {
      const response = await firstValueFrom(
        this.http.post<ApiResponse<LoginResponse>>(url, body, {
          withCredentials: true,
        })
      );

      if (!response.success || !response.data) {
        throw new AuthError(
          'UNKNOWN_ERROR',
          response.error?.message || 'Failed to setup password'
        );
      }

      return response.data;
    } catch (error) {
      throw this.handleError(error, 'UNKNOWN_ERROR');
    }
  }

  // ============================================================================
  // Private Helpers
  // ============================================================================

  /**
   * Format Date to dd/mm/yyyy string
   */
  private formatBirthDate(date: Date): string {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  }

  /**
   * Handle HTTP errors and convert to AuthError
   */
  private handleError(error: unknown, defaultCode: AuthErrorCode): AuthError {
    if (error instanceof AuthError) {
      return error;
    }

    if (error instanceof HttpErrorResponse) {
      // Network error
      if (error.status === 0) {
        return new AuthError('NETWORK_ERROR', 'Unable to connect to server');
      }

      // API error with message
      if (error.error?.error?.message) {
        return new AuthError(
          (error.error.error.code as AuthErrorCode) || defaultCode,
          error.error.error.message
        );
      }

      // HTTP status based error
      if (error.status === 401) {
        return new AuthError('LOGIN_FAILED', 'Invalid email or password');
      }

      if (error.status === 409) {
        return new AuthError('USER_ALREADY_EXISTS', 'An account with this email already exists');
      }
    }

    return new AuthError(defaultCode, 'An unexpected error occurred');
  }
}

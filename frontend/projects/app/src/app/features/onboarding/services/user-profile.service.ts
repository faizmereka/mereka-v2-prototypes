import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../../environments/environment';

// ============================================================================
// Types
// ============================================================================

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  username?: string;
  profilePhoto?: string;
  coverPhoto?: string;
  phoneNumber?: string;
  bio?: string;
  location?: {
    city?: string;
    country?: string;
    lat?: number;
    lng?: number;
  };
  socialLinks?: {
    website?: string;
    facebook?: string;
    instagram?: string;
    twitter?: string;
    linkedin?: string;
  };
}

export interface UpdateProfileDto {
  name?: string;
  username?: string;
  profilePhoto?: string;
  coverPhoto?: string;
  phoneNumber?: string;
  bio?: string;
  location?: {
    city?: string;
    country?: string;
    lat?: number;
    lng?: number;
  };
  socialLinks?: {
    website?: string;
    facebook?: string;
    instagram?: string;
    twitter?: string;
    linkedin?: string;
  };
}

export interface CheckUsernameResult {
  available: boolean;
  username: string;
}

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}

// ============================================================================
// User Profile Service
// ============================================================================

@Injectable({ providedIn: 'root' })
export class UserProfileService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  /**
   * Check if username is available
   */
  async checkUsername(username: string): Promise<CheckUsernameResult> {
    const response = await firstValueFrom(
      this.http.get<ApiResponse<CheckUsernameResult>>(
        `${this.apiUrl}/users/check-username`,
        { params: { username }, withCredentials: true }
      )
    );

    if (!response.success || !response.data) {
      throw new Error(response.error?.message || 'Failed to check username');
    }

    return response.data;
  }

  /**
   * Get current user profile
   */
  async getMyProfile(): Promise<UserProfile> {
    const response = await firstValueFrom(
      this.http.get<ApiResponse<UserProfile>>(
        `${this.apiUrl}/users/me/profile`,
        { withCredentials: true }
      )
    );

    if (!response.success || !response.data) {
      throw new Error(response.error?.message || 'Failed to get profile');
    }

    return response.data;
  }

  /**
   * Update current user profile
   */
  async updateMyProfile(data: UpdateProfileDto): Promise<UserProfile> {
    const response = await firstValueFrom(
      this.http.put<ApiResponse<UserProfile>>(
        `${this.apiUrl}/users/me/profile`,
        data,
        { withCredentials: true }
      )
    );

    if (!response.success || !response.data) {
      throw new Error(response.error?.message || 'Failed to update profile');
    }

    return response.data;
  }
}

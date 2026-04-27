import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../../environments/environment';

// ============================================================================
// Types
// ============================================================================

export interface HubLocation {
  city: string;
  state?: string;
  country: string;
  lat: number;
  lng: number;
  streetAddress?: string;
  address?: string;
  postcode?: string;
}

export interface SocialLinks {
  website?: string;
  facebook?: string;
  linkedin?: string;
  instagram?: string;
  twitter?: string;
  email?: string;
}

export interface CreateHubProfileRequest {
  agencyName: string;
  slug: string;
  agencyLogo: string;
  phoneNumber: string;
  location: HubLocation;
}

export interface UpdateHubProfileRequest {
  agencyName?: string;
  slug?: string;
  agencyLogo?: string;
  phoneNumber?: string;
  coverImage?: string;
  description?: string;
  companyType?: string;
  introVideo?: string;
  gallery?: string[];
  location?: HubLocation;
  socialLinks?: SocialLinks;
  onboardingStep?: number;
}

export interface HubProfile {
  id: string;
  agencyName: string;
  slug: string;
  agencyLogo: string;
  phoneNumber: string;
  coverImage?: string;
  description?: string;
  location?: HubLocation;
  socialLinks?: SocialLinks;
  status: string;
  onboardingStep?: number;
}

export interface HubSubscription {
  planCode: 'scale' | 'soar';
  status: string;
}

export interface HubProfileWithSubscription {
  hub: HubProfile;
  subscription?: HubSubscription | null;
}

export interface SlugCheckResponse {
  available: boolean;
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
// Hub Service - API calls only (state managed in AuthStateService)
// ============================================================================

@Injectable({
  providedIn: 'root',
})
export class HubService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/hub-profile`;

  /**
   * Get hub profile with optional subscription data
   * Uses hubId from AuthStateService.selectedHub if available
   */
  async getHubProfile(options?: {
    hubId?: string;
    includeSubscription?: boolean;
  }): Promise<HubProfileWithSubscription> {
    let params = new HttpParams();

    if (options?.hubId) {
      params = params.set('hubId', options.hubId);
    }

    if (options?.includeSubscription) {
      params = params.set('includeSubscription', 'true');
    }

    const response = await firstValueFrom(
      this.http.get<ApiResponse<HubProfileWithSubscription>>(`${this.apiUrl}/me`, {
        withCredentials: true,
        params,
      })
    );

    if (!response.success || !response.data) {
      throw new Error(response.error?.message || 'Failed to get hub profile');
    }

    return response.data;
  }

  /**
   * Create initial hub profile (from /hub-onboard/form)
   */
  async createHubProfile(data: CreateHubProfileRequest): Promise<HubProfile> {
    // Convert lat/lng to strings to avoid oneOf validation issues
    const payload = {
      ...data,
      location: {
        ...data.location,
        lat: String(data.location.lat),
        lng: String(data.location.lng),
      },
    };

    const response = await firstValueFrom(
      this.http.post<ApiResponse<HubProfile>>(this.apiUrl, payload, {
        withCredentials: true,
      })
    );

    if (!response.success || !response.data) {
      throw new Error(response.error?.message || 'Failed to create hub profile');
    }

    return response.data;
  }

  /**
   * Update hub profile (upsert)
   */
  async updateHubProfile(data: UpdateHubProfileRequest): Promise<HubProfile> {
    // Convert lat/lng to strings if location is provided
    const payload = data.location
      ? {
          ...data,
          location: {
            ...data.location,
            lat: data.location.lat !== undefined ? String(data.location.lat) : undefined,
            lng: data.location.lng !== undefined ? String(data.location.lng) : undefined,
          },
        }
      : data;

    const response = await firstValueFrom(
      this.http.patch<ApiResponse<HubProfile>>(this.apiUrl, payload, {
        withCredentials: true,
      })
    );

    if (!response.success || !response.data) {
      throw new Error(response.error?.message || 'Failed to update hub profile');
    }

    return response.data;
  }

  /**
   * Check if slug is available
   */
  async checkSlug(slug: string): Promise<SlugCheckResponse> {
    const response = await firstValueFrom(
      this.http.get<ApiResponse<SlugCheckResponse>>(
        `${environment.apiUrl}/slug/check/${encodeURIComponent(slug)}?resourceType=hub`,
        { withCredentials: true }
      )
    );

    if (!response.success || !response.data) {
      throw new Error(response.error?.message || 'Failed to check slug');
    }

    return response.data;
  }

  /**
   * Publish hub for approval
   */
  async publishHub(): Promise<void> {
    const response = await firstValueFrom(
      this.http.post<ApiResponse<void>>(`${this.apiUrl}/publish`, {}, {
        withCredentials: true,
      })
    );

    if (!response.success) {
      throw new Error(response.error?.message || 'Failed to publish hub');
    }
  }
}

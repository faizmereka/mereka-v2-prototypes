import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import type {
  ExpertProfileResponse,
  UpdateExpertProfileRequest,
  Skill,
  Language,
  FocusArea,
  JobPreference,
} from '../models';

interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: {
    code: string;
    message: string;
  };
}

interface PaginatedResponse<T> {
  success: boolean;
  data: {
    items: T[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  };
}

interface UsernameCheckResponse {
  available: boolean;
  message?: string;
}

@Injectable({ providedIn: 'root' })
export class ExpertOnboardingApiService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  /**
   * Get current user's expert profile
   * Uses /expert/profile/me endpoint
   */
  async getMyProfile(): Promise<ExpertProfileResponse | null> {
    try {
      const response = await firstValueFrom(
        this.http.get<ApiResponse<ExpertProfileResponse>>(`${this.apiUrl}/expert/profile/me`)
      );

      if (response.success) {
        return response.data;
      }

      return null;
    } catch (error) {
      console.error('Error fetching expert profile:', error);
      return null;
    }
  }

  /**
   * Update user profile (basic fields)
   */
  async updateUserProfile(data: Partial<UpdateExpertProfileRequest>): Promise<boolean> {
    try {
      const response = await firstValueFrom(
        this.http.put<ApiResponse<unknown>>(`${this.apiUrl}/users/me/profile`, {
          name: data.name,
          username: data.username,
          profilePhoto: data.profilePhoto,
          coverPhoto: data.coverPhoto,
          bio: data.bio,
          phoneNumber: data.phoneNumber,
          location: data.location,
          socialLinks: data.socialLinks,
        })
      );
      return response.success;
    } catch (error) {
      console.error('Error updating user profile:', error);
      return false;
    }
  }

  /**
   * Update expert profile via /expert/profile endpoint
   * This includes all expert fields: profile, skills, portfolio, employment, education
   */
  async updateExpertProfile(data: Partial<UpdateExpertProfileRequest>): Promise<boolean> {
    try {
      // Transform languages to match backend format
      const languages = data.languages?.map((lang) => ({
        languageId: lang.languageId,
        proficiency: this.capitalizeFirst(lang.proficiency),
      }));

      const response = await firstValueFrom(
        this.http.patch<ApiResponse<unknown>>(`${this.apiUrl}/expert/profile`, {
          // Profile fields
          name: data.name,
          username: data.username,
          profilePhoto: data.profilePhoto,
          coverPhoto: data.coverPhoto,
          bio: data.bio,
          phoneNumber: data.phoneNumber,
          location: data.location,
          socialLinks: data.socialLinks,
          // Expert fields
          professionalTitle: data.professionalTitle || undefined,
          introVideo: data.introVideo || undefined,
          skills: data.skills?.length ? data.skills : undefined,
          focusAreaId: data.focusAreaId || undefined,
          jobPreferences: data.jobPreferences?.length ? data.jobPreferences : undefined,
          languages: languages?.length ? languages : undefined,
          hourlyRate: data.hourlyRate || undefined,
          // Background
          portfolio: data.portfolio?.length
            ? data.portfolio.map((p) => ({
                title: p.title,
                description: p.description || undefined,
                images: p.images?.length ? p.images : undefined,
                skills: p.skills?.length ? p.skills : undefined,
                year: p.year || undefined,
                projectLink: p.projectLink || undefined,
                startDate: p.startDate || undefined,
                endDate: p.endDate || undefined,
              }))
            : undefined,
          employment: data.employment?.length
            ? data.employment.map((e) => ({
                title: e.title,
                company: e.company,
                city: e.city || undefined,
                country: e.country || undefined,
                startDate: e.startDate || undefined,
                endDate: e.endDate || undefined,
                isOngoing: e.isOngoing,
                duration: e.duration || undefined,
                description: e.description || undefined,
              }))
            : undefined,
          education: data.education?.length
            ? data.education.map((e) => ({
                degree: e.degree,
                institution: e.institution,
                fieldOfStudy: e.fieldOfStudy || undefined,
                startDate: e.startDate || undefined,
                endDate: e.endDate || undefined,
                year: e.year || undefined,
                description: e.description || undefined,
              }))
            : undefined,
        })
      );
      return response.success;
    } catch (error) {
      console.error('Error updating expert profile:', error);
      return false;
    }
  }

  /**
   * Save complete expert profile
   * Uses single /expert/profile endpoint for all fields
   */
  async saveProfile(data: UpdateExpertProfileRequest): Promise<boolean> {
    return this.updateExpertProfile(data);
  }

  /**
   * Check username availability
   */
  async checkUsername(username: string): Promise<{ available: boolean; message?: string }> {
    try {
      const response = await firstValueFrom(
        this.http.get<ApiResponse<UsernameCheckResponse>>(`${this.apiUrl}/users/check-username`, {
          params: { username },
        })
      );

      if (response.success) {
        return {
          available: response.data.available,
          message: response.data.message,
        };
      }

      return { available: false, message: 'Unable to check username' };
    } catch (error) {
      console.error('Error checking username:', error);
      return { available: false, message: 'Error checking username availability' };
    }
  }

  // ============================================================================
  // Reference Data
  // ============================================================================

  /**
   * Get skills list
   */
  async getSkills(query?: string): Promise<Skill[]> {
    try {
      const params: Record<string, string> = {};
      if (query) {
        params['q'] = query;
      }

      const response = await firstValueFrom(
        this.http.get<ApiResponse<Skill[]>>(`${this.apiUrl}/reference-data/skills`, { params })
      );

      return response.success ? response.data : [];
    } catch (error) {
      console.error('Error fetching skills:', error);
      return [];
    }
  }

  /**
   * Get languages list
   */
  async getLanguages(): Promise<Language[]> {
    try {
      const response = await firstValueFrom(
        this.http.get<ApiResponse<Language[]>>(`${this.apiUrl}/reference-data/languages`)
      );

      return response.success ? response.data : [];
    } catch (error) {
      console.error('Error fetching languages:', error);
      return [];
    }
  }

  /**
   * Get focus areas list
   */
  async getFocusAreas(): Promise<FocusArea[]> {
    try {
      const response = await firstValueFrom(
        this.http.get<ApiResponse<FocusArea[]>>(`${this.apiUrl}/reference-data/focus-areas`)
      );

      return response.success ? response.data : [];
    } catch (error) {
      console.error('Error fetching focus areas:', error);
      return [];
    }
  }

  /**
   * Get job preferences list
   */
  async getJobPreferences(): Promise<JobPreference[]> {
    try {
      const response = await firstValueFrom(
        this.http.get<ApiResponse<JobPreference[]>>(`${this.apiUrl}/reference-data/job-preferences`)
      );

      return response.success ? response.data : [];
    } catch (error) {
      console.error('Error fetching job preferences:', error);
      // Return default options if API doesn't exist yet
      return [
        { _id: 'trainer', name: 'Trainer' },
        { _id: 'coach', name: 'Coach' },
        { _id: 'consultant', name: 'Consultant' },
        { _id: 'project-manager', name: 'Project Manager' },
        { _id: 'service-retainer', name: 'Service Retainer' },
      ];
    }
  }

  // ============================================================================
  // Helpers
  // ============================================================================

  private capitalizeFirst(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  }
}

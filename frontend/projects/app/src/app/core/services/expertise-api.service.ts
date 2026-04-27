import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthStateService } from './auth-state.service';

// =============================================================================
// Types
// =============================================================================

export interface ExpertiseOperatingDay {
  key: string;
  fullTitle: string;
  title: string;
  isActive?: boolean;
  fullDay?: boolean;
  startTime?: string;
  endTime?: string;
}

export interface ExpertiseOperatingHours {
  autofill?: boolean;
  sameOperatingHoursForAll?: boolean;
  allOperatingHours?: boolean;
  allOperatingStartTime?: string;
  allOperatingEndTime?: string;
  days: ExpertiseOperatingDay[];
}

export type DurationUnit = 'minutes' | 'hours';

export interface ExpertiseTicket {
  id: string;
  ticketName: string;
  ticketType: 'Paid' | 'Free';
  standardRate: number;
  ticketQty: number;
  description?: string;
  expertiseMode: ExpertiseMode;
  sessionDuration?: number;
  durationUnit?: DurationUnit;
  hasBufferTime?: boolean;
  bufferTime?: number;
  instantBooking?: boolean;
}

export interface CustomQuestion {
  questionLabel: string;
  questionType: string;
  saveStatus?: boolean;
  dropDown?: string[];
  checkBox?: string[];
  multipleChoices?: string[];
}

export interface CustomQuestionsConfig {
  isQuestionMandatory?: boolean;
  questionArray?: CustomQuestion[];
}

export interface ExpertiseHost {
  id: string;
  name: string;
  email?: string;
  profileUrl: string;
  roleId?: string;
  description: string;
}

export type ExpertiseStatus = 'draft' | 'published' | 'archived';
export type ExpertiseMode = 'online' | 'physical' | 'hybrid';
export type AvailabilityType = 'manual' | 'flexible' | 'autofill';
export type LinkMode = 'send' | 'display';
export type LocationType = 'hub' | 'new' | 'other';

export interface ExpertiseLocation {
  locationType?: LocationType;
  venueName?: string;
  autofill?: boolean;
  address?: string;
  country?: string;
  state?: string;
  city?: string;
  lat?: number;
  lng?: number;
}

export interface Expertise {
  _id?: string;
  expertiseTitle: string;
  expertiseDescription: string;
  expertiseSummary: string;
  host: ExpertiseHost;
  tags?: string[];
  primaryLanguage: string;
  secondaryLanguages?: string[];
  slug: string;
  linkMode?: LinkMode;
  expertiseLink?: string;
  location?: ExpertiseLocation;
  coverPhoto: string;
  gallery?: string[];
  expertiseInstructions?: string;
  customQuestions?: CustomQuestionsConfig;
  feePaidBy?: string;
  operatingHours?: ExpertiseOperatingHours;
  availabilityType?: AvailabilityType;
  ticket: ExpertiseTicket[];
  audienceType?: string;
  hubId: string;
  createdBy: string;
  status: ExpertiseStatus;
  currency?: string;
  rating?: number;
  isDisabled?: boolean;
  mandatoryQuestionsForBooking?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export type CreateExpertiseInput = Partial<Expertise> & {
  expertiseTitle: string;
  slug: string;
  hubId: string;
  createdBy: string;
};

export type UpdateExpertiseInput = Partial<Expertise>;

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  meta?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  error?: { code: string; message: string };
}

// =============================================================================
// Expertise API Service
// =============================================================================

@Injectable({ providedIn: 'root' })
export class ExpertiseApiService {
  private readonly http = inject(HttpClient);
  private readonly authState = inject(AuthStateService);

  private get apiUrl(): string {
    const hubId = this.authState.selectedHub()?.id;
    return `${environment.apiUrl}/hub/${hubId}/expertises`;
  }

  // =============================================================================
  // CRUD Operations
  // =============================================================================

  async create(data: CreateExpertiseInput): Promise<Expertise | null> {
    try {
      const response = await firstValueFrom(
        this.http.post<ApiResponse<Expertise>>(this.apiUrl, data, { withCredentials: true })
      );
      return response.success ? response.data ?? null : null;
    } catch (error) {
      console.error('Error creating expertise:', error);
      throw error;
    }
  }

  async update(id: string, data: UpdateExpertiseInput): Promise<Expertise | null> {
    try {
      const response = await firstValueFrom(
        this.http.put<ApiResponse<Expertise>>(`${this.apiUrl}/${id}`, data, { withCredentials: true })
      );
      return response.success ? response.data ?? null : null;
    } catch (error) {
      console.error('Error updating expertise:', error);
      throw error;
    }
  }

  async getById(id: string): Promise<Expertise | null> {
    try {
      const response = await firstValueFrom(
        this.http.get<ApiResponse<Expertise>>(`${this.apiUrl}/${id}`, { withCredentials: true })
      );
      return response.success ? response.data ?? null : null;
    } catch (error) {
      console.error('Error fetching expertise:', error);
      return null;
    }
  }

  async delete(id: string): Promise<boolean> {
    try {
      const response = await firstValueFrom(
        this.http.delete<ApiResponse<void>>(`${this.apiUrl}/${id}`, { withCredentials: true })
      );
      return response.success;
    } catch (error) {
      console.error('Error deleting expertise:', error);
      return false;
    }
  }

  // =============================================================================
  // Status Operations
  // =============================================================================

  async publish(id: string): Promise<Expertise | null> {
    try {
      const response = await firstValueFrom(
        this.http.patch<ApiResponse<Expertise>>(`${this.apiUrl}/${id}/publish`, {}, { withCredentials: true })
      );
      return response.success ? response.data ?? null : null;
    } catch (error) {
      console.error('Error publishing expertise:', error);
      return null;
    }
  }

  async archive(id: string): Promise<Expertise | null> {
    try {
      const response = await firstValueFrom(
        this.http.patch<ApiResponse<Expertise>>(`${this.apiUrl}/${id}/archive`, {}, { withCredentials: true })
      );
      return response.success ? response.data ?? null : null;
    } catch (error) {
      console.error('Error archiving expertise:', error);
      return null;
    }
  }

  // =============================================================================
  // List Operations
  // =============================================================================

  async list(params?: {
    status?: string;
    isDisabled?: boolean;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }): Promise<{ expertises: Expertise[]; total: number }> {
    try {
      const queryParams: Record<string, string | number | boolean> = {};
      if (params?.status) queryParams['status'] = params.status;
      if (params?.isDisabled !== undefined) queryParams['isDisabled'] = params.isDisabled;
      if (params?.page) queryParams['page'] = params.page;
      if (params?.limit) queryParams['limit'] = params.limit;
      if (params?.sortBy) queryParams['sortBy'] = params.sortBy;
      if (params?.sortOrder) queryParams['sortOrder'] = params.sortOrder;

      const response = await firstValueFrom(
        this.http.get<ApiResponse<Expertise[]>>(this.apiUrl, {
          params: queryParams as Record<string, string>,
          withCredentials: true,
        })
      );

      if (response.success && response.data) {
        return {
          expertises: response.data,
          total: response.meta?.total ?? response.data.length,
        };
      }
      return { expertises: [], total: 0 };
    } catch (error) {
      console.error('Error listing expertises:', error);
      return { expertises: [], total: 0 };
    }
  }

  // =============================================================================
  // Validation
  // =============================================================================

  async checkSlugAvailability(slug: string, excludeId?: string): Promise<boolean> {
    try {
      const params: Record<string, string> = { slug };
      if (excludeId) params['excludeId'] = excludeId;

      const response = await firstValueFrom(
        this.http.get<ApiResponse<{ available: boolean }>>(`${this.apiUrl}/check/slug`, {
          params,
          withCredentials: true,
        })
      );
      return response.success ? response.data?.available ?? false : false;
    } catch (error) {
      console.error('Error checking slug availability:', error);
      return false;
    }
  }
}

import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import { AuthStateService } from '../../../../core/services/auth-state.service';

// =============================================================================
// Types
// =============================================================================

export interface ExperienceLocation {
  locationType?: 'hub' | 'new' | 'other'; // Type of location selection
  venueName?: string; // Venue name (for 'other' type)
  autofill?: boolean;
  address: string;
  country: string;
  state: string;
  city: string;
  lat?: number;
  lng?: number;
}

export interface ExperienceTopic {
  theme: string;
  topic: string;
}

export type HostAccess = 'FULL_ACCESS' | 'EXPORT_ONLY' | 'VIEW_ONLY';

export interface ExperienceHost {
  userId?: string;
  name?: string;
  email?: string;
  photoUrl?: string;
  roleId?: string;
  description?: string;

  // Frontend-only flags (not persisted to backend)
  isNew?: boolean;
  isEditing?: boolean;
}

export interface ExperienceTicket {
  id?: string;
  ticketType: 'Paid' | 'Free';
  ticketName: string;
  ticketPrice: number;
  ticketQty: number;
  description?: string;
  hasCutoffTime?: boolean;
  cutoffNumber?: number;
  cutoffTime?: string;
  cutoffBeforeAfter?: string;
}

export interface ExperienceSchedule {
  uid: string;
  recurringRule: string[];
  startDate: string | Date;
  endDate?: string | Date;
  recurringType: string;
  lockedEvents?: string[];
  readOnly?: boolean;
  isDeleted?: boolean;
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

export interface Experience {
  _id?: string;
  experienceTitle: string;
  slug: string;
  experienceDescription?: string;
  experienceType: 'Physical' | 'Virtual' | 'Hybrid';
  hubId: string;
  experienceCategory?: string;
  experienceTopics?: ExperienceTopic[];
  location?: ExperienceLocation;
  timeZone?: string;
  meetingLink?: string;
  meetingLocation?: string;
  virtualHostingLocation?: { country: string };
  hostDetails: ExperienceHost[];
  noHost: boolean;
  audienceType: 'Everyone' | 'Members Only' | 'Hidden';
  maximumCapacity?: number;
  canBookAsPrivate: boolean;
  targetAudience: string[];
  expertiseLevel?: string;
  expertiseFields?: string[];
  primaryLanguage?: string;
  secondaryLanguage?: string[];
  feePaidBy: 'learner' | 'hub';
  currency: string;
  ticket?: ExperienceTicket[];
  experienceDuration?: number;
  schedules?: ExperienceSchedule[];
  coverPhoto?: string;
  gallery?: string[];
  video?: string;
  poster?: string;
  learnerOutcome?: string;
  instruction?: string;
  materialProvided?: string;
  materialNeedToBring?: string;
  customQuestions?: CustomQuestionsConfig;
  status: 'ACTIVE' | 'DRAFTED' | 'DELETED' | 'EXPIRED';
  listingType: 'platform' | 'express';
  priority: number;
  isFeatured: boolean;
  views: number;
  createdAt?: Date;
  updatedAt?: Date;
  // Overview data from API (for manage listing page)
  upcomingEvents?: ExperienceEvent[];
  stats?: {
    totalSessions: number;
    totalBookings: number;
    upcomingSessions: number;
    pageViews: number;
  };
}

export interface SessionTicketInfo {
  ticketId: string;
  ticketName: string;
  ticketType: string;
  totalCapacity: number;
  booked: number;
  held: number;
  available: number;
}

export interface ExperienceEvent {
  _id?: string;
  experienceId: string;
  scheduleId: string;
  startTime: string | Date;
  endTime: string | Date;
  status: 'ACTIVE' | 'CANCELLED' | 'DELETED';
  isLocked: boolean;
  bookingCount?: number;
  holdCount?: number;
  maxCapacity?: number;
  tickets?: SessionTicketInfo[];
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ExperienceSessionsResponse {
  sessions: ExperienceEvent[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ExperienceBooking {
  _id: string;
  bookingType: string;
  serviceName: string;
  serviceId: string;
  eventId?: string;
  bookingStartDate: string | Date;
  bookingEndDate: string | Date;
  status: string;
  totalCost: number;
  currency: string;
  isFree: boolean;
  ticketCount: number;
  learners: Array<{
    name: string;
    email: string;
    ticketName?: string;
    ticketType?: string;
  }>;
  bookerName: string;
  bookerEmail: string;
  createdAt: string | Date;
}

export interface ExperienceBookingsResponse {
  bookings: ExperienceBooking[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export type CreateExperienceInput = Partial<Experience> & {
  experienceTitle: string;
  slug: string;
  experienceType: 'Physical' | 'Virtual' | 'Hybrid';
  hubId: string;
};

export type UpdateExperienceInput = Partial<Experience>;

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: { code: string; message: string };
}

// =============================================================================
// Experience API Service
// =============================================================================

@Injectable({ providedIn: 'root' })
export class ExperienceApiService {
  private readonly http = inject(HttpClient);
  private readonly authState = inject(AuthStateService);

  private get apiUrl(): string {
    const hubId = this.authState.selectedHub()?.id;
    return `${environment.apiUrl}/hub/${hubId}/experiences`;
  }

  // =============================================================================
  // CRUD Operations
  // =============================================================================

  async create(data: CreateExperienceInput): Promise<Experience | null> {
    try {
      const response = await firstValueFrom(
        this.http.post<ApiResponse<Experience>>(this.apiUrl, data, { withCredentials: true })
      );
      return response.success ? response.data ?? null : null;
    } catch (error) {
      console.error('Error creating experience:', error);
      throw error;
    }
  }

  async update(id: string, data: UpdateExperienceInput): Promise<Experience | null> {
    try {
      const response = await firstValueFrom(
        this.http.patch<ApiResponse<Experience>>(`${this.apiUrl}/${id}`, data, { withCredentials: true })
      );
      return response.success ? response.data ?? null : null;
    } catch (error) {
      console.error('Error updating experience:', error);
      throw error;
    }
  }

  async getById(id: string): Promise<Experience | null> {
    try {
      const response = await firstValueFrom(
        this.http.get<ApiResponse<Experience>>(`${this.apiUrl}/${id}`, { withCredentials: true })
      );
      return response.success ? response.data ?? null : null;
    } catch (error) {
      console.error('Error fetching experience:', error);
      return null;
    }
  }

  async getBySlug(slug: string): Promise<Experience | null> {
    try {
      const response = await firstValueFrom(
        this.http.get<ApiResponse<Experience>>(`${this.apiUrl}/slug/${slug}`, { withCredentials: true })
      );
      return response.success ? response.data ?? null : null;
    } catch (error) {
      console.error('Error fetching experience by slug:', error);
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
      console.error('Error deleting experience:', error);
      return false;
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

  // =============================================================================
  // List Operations
  // =============================================================================

  async list(params?: {
    status?: string;
    listingType?: string;
    page?: number;
    limit?: number;
  }): Promise<{ experiences: Experience[]; total: number }> {
    try {
      const response = await firstValueFrom(
        this.http.get<ApiResponse<{ experiences: Experience[]; total: number }>>(this.apiUrl, {
          params: params as Record<string, string>,
          withCredentials: true,
        })
      );
      return response.success && response.data
        ? response.data
        : { experiences: [], total: 0 };
    } catch (error) {
      console.error('Error listing experiences:', error);
      return { experiences: [], total: 0 };
    }
  }

  // =============================================================================
  // Sessions/Events Operations
  // =============================================================================

  async getSessions(
    experienceId: string,
    params?: {
      filter?: 'all' | 'upcoming' | 'past';
      page?: number;
      limit?: number;
    }
  ): Promise<ExperienceSessionsResponse> {
    try {
      const response = await firstValueFrom(
        this.http.get<ApiResponse<ExperienceSessionsResponse>>(
          `${this.apiUrl}/${experienceId}/sessions`,
          {
            params: params as Record<string, string>,
            withCredentials: true,
          }
        )
      );
      return response.success && response.data
        ? response.data
        : { sessions: [], total: 0, page: 1, limit: 20, totalPages: 0 };
    } catch (error) {
      console.error('Error fetching experience sessions:', error);
      return { sessions: [], total: 0, page: 1, limit: 20, totalPages: 0 };
    }
  }

  // =============================================================================
  // Bookings Operations
  // =============================================================================

  async getBookings(
    experienceId: string,
    params?: {
      eventId?: string;
      status?: 'upcoming' | 'past' | 'cancelled' | 'all';
      page?: number;
      limit?: number;
      search?: string;
    }
  ): Promise<ExperienceBookingsResponse> {
    try {
      const hubId = this.authState.selectedHub()?.id;

      // Filter out undefined/null values from params
      const cleanParams: Record<string, string | number> = {};
      if (params) {
        Object.entries(params).forEach(([key, value]) => {
          if (value !== undefined && value !== null && value !== '') {
            cleanParams[key] = value;
          }
        });
      }

      const response = await firstValueFrom(
        this.http.get<ApiResponse<ExperienceBookingsResponse>>(
          `${environment.apiUrl}/hub/${hubId}/bookings/experiences/${experienceId}`,
          {
            params: cleanParams,
            withCredentials: true,
          }
        )
      );
      return response.success && response.data
        ? response.data
        : { bookings: [], total: 0, page: 1, limit: 20, totalPages: 0 };
    } catch (error) {
      console.error('Error fetching experience bookings:', error);
      return { bookings: [], total: 0, page: 1, limit: 20, totalPages: 0 };
    }
  }
}

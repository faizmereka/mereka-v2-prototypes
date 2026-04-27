import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

// Experience Types
export type ExperienceStatus = 'ACTIVE' | 'DRAFTED' | 'DELETED' | 'EXPIRED';
export type ExperienceType = 'Physical' | 'Virtual' | 'Hybrid';

export interface Experience {
  _id: string;
  experienceTitle: string;
  slug: string;
  coverPhoto?: string;
  experienceType: ExperienceType;
  experienceDescription?: string;
  status: ExperienceStatus;
  isFeatured: boolean;
  views: number;
  priority: number;
  audienceType: string;
  currency: string;
  listingType?: string;
  maximumCapacity?: number;
  rating?: number;
  experienceDuration?: number;
  timeZone?: string;
  isMultiDay?: boolean;
  noHost?: boolean;
  canBookAsPrivate?: boolean;
  canBookOngoingEvent?: boolean;
  feePaidBy?: string;
  cutOffTime?: number;
  cutOffTimeUnit?: string;
  isShowCaseOnProfile?: boolean;
  expertiseLevel?: string;
  primaryLanguage?: string;
  secondaryLanguage?: string[];
  video?: string;
  poster?: string;
  meetingLink?: string;
  meetingLocation?: string;
  learnerOutcome?: string;
  instruction?: string;
  materialProvided?: string;
  materialNeedToBring?: string;
  targetAudience?: string[];
  gallery?: string[];
  location?: {
    streetAddress?: string;
    city?: string;
    state?: string;
    country?: string;
    postcode?: string;
    lat?: number;
    lng?: number;
    addressAdditionalNote?: string;
  };
  hostDetails?: Array<{
    expertId?: string;
    fullName?: string;
    expertName?: string;
    email?: string;
    profileUrl?: string;
    description?: string;
    type?: string;
  }>;
  schedules?: Array<{
    uid: string;
    recurringType: string;
    startDate: string;
    endDate?: string;
    recurringRule?: string[];
  }>;
  ticket?: Array<{
    id?: string;
    ticketType: string;
    ticketName: string;
    ticketPrice: number;
    ticketQty: number;
    description?: string;
    hasCutoffTime?: boolean;
    cutoffNumber?: number;
    cutoffTime?: string;
    cutoffBeforeAfter?: string;
    // Booking stats (from API)
    totalCapacity?: number;
    booked?: number;
    available?: number;
    bookingCount?: number;
    isSoldOut?: boolean;
  }>;
  createdAt: string;
  updatedAt: string;
  hubId: string;
  createdBy?: string;
  hub?: {
    _id: string;
    name: string;
    logo?: string;
    slug: string;
  };
  // Added from detail API for events and readable schedules
  upcomingEvents?: ExperienceEvent[];
  pastEvents?: ExperienceEvent[];
  schedulesWithReadableRules?: ScheduleWithReadableRule[];
  // Booking stats summary
  bookingStats?: {
    totalBookings: number;
    totalTicketsSold: number;
    totalCapacity: number;
  };
}

export interface ExperienceStats {
  total: number;
  byStatus: {
    ACTIVE: number;
    DRAFTED: number;
    EXPIRED: number;
  };
  byType: {
    Physical: number;
    Virtual: number;
    Hybrid: number;
  };
  featured: number;
  toReview: number;
  active: number;
  recentExperiences: Array<{
    _id: string;
    experienceTitle: string;
    coverPhoto?: string;
    createdAt: string;
    status: ExperienceStatus;
  }>;
}

export interface ListExperiencesParams {
  page?: number;
  limit?: number;
  status?: ExperienceStatus;
  search?: string;
  isFeatured?: boolean;
  hubId?: string;
  experienceType?: ExperienceType;
  dateFrom?: string;
  dateTo?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// Event ticket booking stats
export interface EventTicketBooking {
  _id: string;
  ticketName: string;
  ticketType?: string;
  totalBooked: number;
  bookingCount: number;
}

// Experience Event interface
export interface ExperienceEvent {
  _id: string;
  experienceId: string;
  scheduleId: string;
  startTime: string;
  endTime: string;
  timeZone: string;
  isRecurring: boolean;
  status: 'ACTIVE' | 'CANCELLED' | 'DELETED';
  isLocked: boolean;
  createdAt: string;
  updatedAt: string;
  // Booking stats per event
  ticketBookings?: EventTicketBooking[];
  totalBookings?: number;
  totalTicketsSold?: number;
}

// Schedule with human-readable rule
export interface ScheduleWithReadableRule {
  uid: string;
  recurringType: string;
  startDate: string;
  endDate?: string;
  recurringRule?: string[];
  readableRule: string;
}

// Experience Events Response
export interface ExperienceEventsResponse {
  events: ExperienceEvent[];
  schedules: ScheduleWithReadableRule[];
  total: number;
}

// Expertise Types
export type ExpertiseStatus = 'draft' | 'published' | 'archived';

export interface Expertise {
  _id: string;
  expertiseTitle: string;
  slug: string;
  expertiseSummary: string;
  coverPhoto: string;
  status: ExpertiseStatus;
  isDisabled: boolean;
  currency: string;
  ticket?: Array<{
    id: string;
    ticketName: string;
    ticketType: string;
    standardRate: number;
    ticketQty: number;
  }>;
  host?: {
    id: string;
    name: string;
    profileUrl: string;
    description: string;
  };
  rating?: number;
  primaryLanguage: string;
  createdAt: string;
  updatedAt: string;
  hubId: string;
  createdBy: string;
  hub?: {
    _id: string;
    name: string;
    logo?: string;
    slug: string;
  };
  creator?: {
    _id: string;
    name: string;
    email: string;
    profilePhoto?: string;
  };
}

export interface ExpertiseStats {
  total: number;
  byStatus: {
    draft: number;
    published: number;
    archived: number;
  };
  disabled: number;
  toReview: number;
  published: number;
  recentExpertise: Array<{
    _id: string;
    expertiseTitle: string;
    coverPhoto?: string;
    createdAt: string;
    status: ExpertiseStatus;
  }>;
}

export interface ListExpertisesParams {
  page?: number;
  limit?: number;
  status?: ExpertiseStatus;
  search?: string;
  hubId?: string;
  isDisabled?: boolean;
  dateFrom?: string;
  dateTo?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// Tab Stats interface for combined counts
export interface ServicesTabStats {
  experiences: {
    total: number;
    active: number;
    drafted: number;
    expired: number;
  };
  expertise: {
    total: number;
    published: number;
    draft: number;
  };
}

// Common Types
interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  meta?: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

@Injectable({
  providedIn: 'root',
})
export class ServicesService {
  private readonly http = inject(HttpClient);
  private readonly servicesUrl = `${environment.apiUrl}/admin/services`;
  private readonly experiencesUrl = `${environment.apiUrl}/admin/experiences`;
  private readonly expertisesUrl = `${environment.apiUrl}/admin/expertises`;

  // =====================
  // COMBINED TAB STATS
  // =====================

  /**
   * Get combined tab stats for services page
   * Returns counts for both experiences and expertise tabs
   */
  getTabStats(): Observable<ApiResponse<ServicesTabStats>> {
    return this.http.get<ApiResponse<ServicesTabStats>>(`${this.servicesUrl}/stats`);
  }

  // =====================
  // EXPERIENCE METHODS
  // =====================

  /**
   * Get experience statistics
   */
  getExperienceStats(): Observable<ApiResponse<ExperienceStats>> {
    return this.http.get<ApiResponse<ExperienceStats>>(`${this.experiencesUrl}/stats`);
  }

  /**
   * List experiences with filtering and pagination
   */
  listExperiences(params?: ListExperiencesParams): Observable<ApiResponse<Experience[]>> {
    const queryParams: Record<string, string> = {};

    if (params?.page) queryParams['page'] = params.page.toString();
    if (params?.limit) queryParams['limit'] = params.limit.toString();
    if (params?.status) queryParams['status'] = params.status;
    if (params?.search) queryParams['search'] = params.search;
    if (params?.isFeatured !== undefined) queryParams['isFeatured'] = params.isFeatured.toString();
    if (params?.hubId) queryParams['hubId'] = params.hubId;
    if (params?.experienceType) queryParams['experienceType'] = params.experienceType;
    if (params?.dateFrom) queryParams['dateFrom'] = params.dateFrom;
    if (params?.dateTo) queryParams['dateTo'] = params.dateTo;
    if (params?.sortBy) queryParams['sortBy'] = params.sortBy;
    if (params?.sortOrder) queryParams['sortOrder'] = params.sortOrder;

    return this.http.get<ApiResponse<Experience[]>>(this.experiencesUrl, { params: queryParams });
  }

  /**
   * Get experience by ID
   */
  getExperienceById(id: string): Observable<ApiResponse<Experience>> {
    return this.http.get<ApiResponse<Experience>>(`${this.experiencesUrl}/${id}`);
  }

  /**
   * Update experience status
   */
  updateExperienceStatus(
    id: string,
    status: ExperienceStatus,
    reason?: string,
  ): Observable<ApiResponse<Experience>> {
    return this.http.patch<ApiResponse<Experience>>(`${this.experiencesUrl}/${id}/status`, {
      status,
      reason,
    });
  }

  /**
   * Toggle experience featured status
   */
  toggleExperienceFeatured(id: string): Observable<ApiResponse<Experience>> {
    return this.http.post<ApiResponse<Experience>>(`${this.experiencesUrl}/${id}/featured`, {});
  }

  /**
   * Delete experience
   */
  deleteExperience(id: string): Observable<ApiResponse<void>> {
    return this.http.delete<ApiResponse<void>>(`${this.experiencesUrl}/${id}`);
  }

  /**
   * Bulk update experience status
   */
  bulkUpdateExperienceStatus(
    experienceIds: string[],
    status: ExperienceStatus,
  ): Observable<ApiResponse<{ modifiedCount: number }>> {
    return this.http.post<ApiResponse<{ modifiedCount: number }>>(
      `${this.experiencesUrl}/bulk-status`,
      { experienceIds, status },
    );
  }

  /**
   * Update experience priority/order
   */
  updateExperiencePriority(id: string, priority: number): Observable<ApiResponse<Experience>> {
    return this.http.patch<ApiResponse<Experience>>(`${this.experiencesUrl}/${id}/priority`, {
      priority,
    });
  }

  /**
   * Get experience events (upcoming occurrences with readable schedules)
   */
  getExperienceEvents(
    id: string,
    params?: { limit?: number; status?: string; upcoming?: boolean },
  ): Observable<ApiResponse<ExperienceEventsResponse>> {
    const queryParams: Record<string, string> = {};
    if (params?.limit) queryParams['limit'] = params.limit.toString();
    if (params?.status) queryParams['status'] = params.status;
    if (params?.upcoming !== undefined) queryParams['upcoming'] = params.upcoming.toString();

    return this.http.get<ApiResponse<ExperienceEventsResponse>>(
      `${this.experiencesUrl}/${id}/events`,
      { params: queryParams },
    );
  }

  // =====================
  // EXPERTISE METHODS
  // =====================

  /**
   * Get expertise statistics
   */
  getExpertiseStats(): Observable<ApiResponse<ExpertiseStats>> {
    return this.http.get<ApiResponse<ExpertiseStats>>(`${this.expertisesUrl}/stats`);
  }

  /**
   * List expertises with filtering and pagination
   */
  listExpertises(params?: ListExpertisesParams): Observable<ApiResponse<Expertise[]>> {
    const queryParams: Record<string, string> = {};

    if (params?.page) queryParams['page'] = params.page.toString();
    if (params?.limit) queryParams['limit'] = params.limit.toString();
    if (params?.status) queryParams['status'] = params.status;
    if (params?.search) queryParams['search'] = params.search;
    if (params?.hubId) queryParams['hubId'] = params.hubId;
    if (params?.isDisabled !== undefined) queryParams['isDisabled'] = params.isDisabled.toString();
    if (params?.dateFrom) queryParams['dateFrom'] = params.dateFrom;
    if (params?.dateTo) queryParams['dateTo'] = params.dateTo;
    if (params?.sortBy) queryParams['sortBy'] = params.sortBy;
    if (params?.sortOrder) queryParams['sortOrder'] = params.sortOrder;

    return this.http.get<ApiResponse<Expertise[]>>(this.expertisesUrl, { params: queryParams });
  }

  /**
   * Get expertise by ID
   */
  getExpertiseById(id: string): Observable<ApiResponse<Expertise>> {
    return this.http.get<ApiResponse<Expertise>>(`${this.expertisesUrl}/${id}`);
  }

  /**
   * Update expertise status
   */
  updateExpertiseStatus(
    id: string,
    status: ExpertiseStatus,
    reason?: string,
  ): Observable<ApiResponse<Expertise>> {
    return this.http.patch<ApiResponse<Expertise>>(`${this.expertisesUrl}/${id}/status`, {
      status,
      reason,
    });
  }

  /**
   * Toggle expertise disabled status
   */
  toggleExpertiseDisabled(id: string): Observable<ApiResponse<Expertise>> {
    return this.http.post<ApiResponse<Expertise>>(`${this.expertisesUrl}/${id}/toggle-disabled`, {});
  }

  /**
   * Delete expertise
   */
  deleteExpertise(id: string): Observable<ApiResponse<void>> {
    return this.http.delete<ApiResponse<void>>(`${this.expertisesUrl}/${id}`);
  }

  /**
   * Bulk update expertise status
   */
  bulkUpdateExpertiseStatus(
    expertiseIds: string[],
    status: ExpertiseStatus,
  ): Observable<ApiResponse<{ modifiedCount: number }>> {
    return this.http.post<ApiResponse<{ modifiedCount: number }>>(
      `${this.expertisesUrl}/bulk-status`,
      { expertiseIds, status },
    );
  }
}

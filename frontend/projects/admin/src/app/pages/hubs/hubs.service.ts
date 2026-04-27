import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export type HubStatus = 'draft' | 'pending_review' | 'approved' | 'active' | 'rejected' | 'inactive';

export interface Hub {
  _id: string;
  name: string;
  slug: string;
  logo: string;
  phoneNumber: string;
  coverImage?: string;
  description?: string;
  introVideo?: string;
  gallery?: string[];
  status: HubStatus;
  isActive: boolean;
  isFeatured: boolean;
  displayOrder?: number;
  ownerId: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  onboardingStep?: number;
  autoPopulateImages?: boolean;
  displayFullAddress?: boolean;
  location?: {
    address?: string;
    city?: string;
    state?: string;
    country?: string;
    postcode?: string;
    lat?: number;
    lng?: number;
  };
  operatingHours?: {
    [key: string]: {
      open?: string;
      close?: string;
      isClosed?: boolean;
    };
  };
  socialLinks?: {
    website?: string;
    facebook?: string;
    linkedin?: string;
    instagram?: string;
    twitter?: string;
    email?: string;
  };
  tags?: string[];
  services?: string[];
  amenities?: string[];
  facilities?: string[];
  focusAreas?: string[];
  spaceTypes?: string[];
  experienceTypes?: string[];
  companyType?: string;
  owner?: {
    _id: string;
    name: string;
    email: string;
    profilePhoto?: string;
  };
  plan?: string;
  subscriptionStatus?: string;
  subscriptionId?: string;
  lastUpdatedBy?: string;
}

export interface HubStats {
  total: number;
  byStatus: {
    draft: number;
    pending_review: number;
    approved: number;
    active: number;
    rejected: number;
    inactive: number;
  };
  featured: number;
  toReview: number;
  active: number;
  recentHubs: Array<{
    _id: string;
    name: string;
    logo: string;
    createdAt: string;
    status: HubStatus;
  }>;
}

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

export interface ListHubsParams {
  page?: number;
  limit?: number;
  status?: HubStatus;
  search?: string;
  isFeatured?: boolean;
  plan?: string;
  dateFrom?: string;
  dateTo?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface Plan {
  _id: string;
  planCode: string;
  name: string;
  status: string;
}

@Injectable({
  providedIn: 'root',
})
export class HubsService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/admin/hubs`;
  private readonly plansUrl = `${environment.apiUrl}/admin/plans`;

  /**
   * Get hub statistics
   */
  getStats(): Observable<ApiResponse<HubStats>> {
    return this.http.get<ApiResponse<HubStats>>(`${this.apiUrl}/stats`);
  }

  /**
   * List hubs with filtering and pagination
   */
  listHubs(params?: ListHubsParams): Observable<ApiResponse<Hub[]>> {
    const queryParams: Record<string, string> = {};

    if (params?.page) queryParams['page'] = params.page.toString();
    if (params?.limit) queryParams['limit'] = params.limit.toString();
    if (params?.status) queryParams['status'] = params.status;
    if (params?.search) queryParams['search'] = params.search;
    if (params?.isFeatured !== undefined) queryParams['isFeatured'] = params.isFeatured.toString();
    if (params?.plan) queryParams['plan'] = params.plan;
    if (params?.dateFrom) queryParams['dateFrom'] = params.dateFrom;
    if (params?.dateTo) queryParams['dateTo'] = params.dateTo;
    if (params?.sortBy) queryParams['sortBy'] = params.sortBy;
    if (params?.sortOrder) queryParams['sortOrder'] = params.sortOrder;

    return this.http.get<ApiResponse<Hub[]>>(this.apiUrl, { params: queryParams });
  }

  /**
   * Get hub by ID
   */
  getHubById(id: string): Observable<ApiResponse<Hub>> {
    return this.http.get<ApiResponse<Hub>>(`${this.apiUrl}/${id}`);
  }

  /**
   * Update hub status
   */
  updateStatus(id: string, status: HubStatus, reason?: string): Observable<ApiResponse<Hub>> {
    return this.http.patch<ApiResponse<Hub>>(`${this.apiUrl}/${id}/status`, { status, reason });
  }

  /**
   * Toggle featured status
   */
  toggleFeatured(id: string): Observable<ApiResponse<Hub>> {
    return this.http.post<ApiResponse<Hub>>(`${this.apiUrl}/${id}/featured`, {});
  }

  /**
   * Delete hub
   */
  deleteHub(id: string): Observable<ApiResponse<void>> {
    return this.http.delete<ApiResponse<void>>(`${this.apiUrl}/${id}`);
  }

  /**
   * Bulk update status
   */
  bulkUpdateStatus(hubIds: string[], status: HubStatus): Observable<ApiResponse<{ modifiedCount: number; }>> {
    return this.http.post<ApiResponse<{ modifiedCount: number; }>>(`${this.apiUrl}/bulk-status`, {
      hubIds,
      status,
    });
  }

  /**
   * Get all plans for filtering
   */
  getPlans(): Observable<ApiResponse<Plan[]>> {
    return this.http.get<ApiResponse<Plan[]>>(this.plansUrl);
  }

  /**
   * Update hub display order
   */
  updateOrder(id: string, displayOrder: number): Observable<ApiResponse<Hub>> {
    return this.http.patch<ApiResponse<Hub>>(`${this.apiUrl}/${id}/order`, { displayOrder });
  }
}


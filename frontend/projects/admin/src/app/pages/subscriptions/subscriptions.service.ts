import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import type { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

// Subscription types matching backend
export type SubscriptionStatus = 'active' | 'past_due' | 'cancelled' | 'expired' | 'trialing';
export type PlanCode = 'scale' | 'soar';

// Stats interfaces
export interface SubscriptionStats {
  total: number;
  byPlan: {
    scale: number;
    soar: number;
  };
  byStatus: {
    active: number;
    trialing: number;
    past_due: number;
    cancelled: number;
    expired: number;
  };
  revenue: {
    mrr: number;
    totalRevenue: number;
    currency: string;
  };
}

// Plan interface for subscription detail
export interface Plan {
  name: string;
  tagline: string;
  description: string;
  features: string[];
  stripeProductId: string;
  stripePriceId: string;
}

// Subscription interface
export interface Subscription {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  hubId?: string;
  hubName?: string;
  planCode: PlanCode;
  status: SubscriptionStatus;
  price: number;
  currency: string;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  nextBillingDate: Date;
  trialEndDate?: Date;
  stripeSubscriptionId: string;
  stripeCustomerId?: string;
  billingCycle?: string;
  plan?: Plan;
  createdAt: Date;
  updatedAt: Date;
}

// List params
export interface ListSubscriptionsParams {
  page?: number;
  limit?: number;
  planCode?: PlanCode;
  status?: SubscriptionStatus;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// Response interfaces
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: {
    code: string;
    message: string;
  };
}

export interface PaginatedResponse<T> {
  subscriptions: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

@Injectable({
  providedIn: 'root'
})
export class SubscriptionsService {
  private http = inject(HttpClient);
  private baseUrl = `${environment.apiUrl}/admin/subscriptions`;

  /**
   * Get subscription statistics
   */
  getStats(): Observable<ApiResponse<SubscriptionStats>> {
    return this.http.get<ApiResponse<SubscriptionStats>>(`${this.baseUrl}/stats`);
  }

  /**
   * List subscriptions with pagination and filters
   */
  listSubscriptions(params: ListSubscriptionsParams = {}): Observable<ApiResponse<PaginatedResponse<Subscription>>> {
    let httpParams = new HttpParams();

    if (params.page) httpParams = httpParams.set('page', params.page.toString());
    if (params.limit) httpParams = httpParams.set('limit', params.limit.toString());
    if (params.planCode) httpParams = httpParams.set('planCode', params.planCode);
    if (params.status) httpParams = httpParams.set('status', params.status);
    if (params.search) httpParams = httpParams.set('search', params.search);
    if (params.sortBy) httpParams = httpParams.set('sortBy', params.sortBy);
    if (params.sortOrder) httpParams = httpParams.set('sortOrder', params.sortOrder);

    return this.http.get<ApiResponse<PaginatedResponse<Subscription>>>(this.baseUrl, { params: httpParams });
  }

  /**
   * Get subscription by ID
   */
  getSubscription(id: string): Observable<ApiResponse<Subscription>> {
    return this.http.get<ApiResponse<Subscription>>(`${this.baseUrl}/${id}`);
  }
}

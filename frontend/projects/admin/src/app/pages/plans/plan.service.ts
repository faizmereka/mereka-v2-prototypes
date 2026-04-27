import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export type PlanStatus = 'active' | 'inactive' | 'archived';

export interface Plan {
  _id: string;
  planCode: string;
  name: string;
  tagline: string;
  description: string;
  price: number;
  currency: string;
  stripePriceId: string;
  stripeProductId: string;
  features: string[];
  status: PlanStatus;
  sortOrder: number;
  createdBy: string;
  lastUpdatedBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePlanInput {
  planCode: string;
  name: string;
  tagline: string;
  description: string;
  price: number;
  currency: string;
  stripePriceId: string;
  stripeProductId: string;
  features?: string[];
  sortOrder?: number;
}

export interface UpdatePlanInput {
  name?: string;
  tagline?: string;
  description?: string;
  price?: number;
  currency?: string;
  stripePriceId?: string;
  stripeProductId?: string;
  features?: string[];
  status?: PlanStatus;
  sortOrder?: number;
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

@Injectable({
  providedIn: 'root'
})
export class PlanService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/admin/plans`;

  listPlans(): Observable<ApiResponse<Plan[]>> {
    return this.http.get<ApiResponse<Plan[]>>(this.apiUrl);
  }

  getPlanByCode(planCode: string): Observable<ApiResponse<Plan>> {
    return this.http.get<ApiResponse<Plan>>(`${this.apiUrl}/${planCode}`);
  }

  createPlan(data: CreatePlanInput): Observable<ApiResponse<Plan>> {
    return this.http.post<ApiResponse<Plan>>(this.apiUrl, data);
  }

  updatePlan(planCode: string, data: UpdatePlanInput): Observable<ApiResponse<Plan>> {
    return this.http.patch<ApiResponse<Plan>>(`${this.apiUrl}/${planCode}`, data);
  }

  deletePlan(planCode: string): Observable<ApiResponse<void>> {
    return this.http.delete<ApiResponse<void>>(`${this.apiUrl}/${planCode}`);
  }

  activatePlan(planCode: string): Observable<ApiResponse<Plan>> {
    return this.http.post<ApiResponse<Plan>>(`${this.apiUrl}/${planCode}/activate`, {});
  }

  formatPrice(price: number, currency: string): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(price / 100);
  }
}

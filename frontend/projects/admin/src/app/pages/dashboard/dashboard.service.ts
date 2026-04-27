import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import type { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface DashboardStats {
  users: {
    total: number;
    active: number;
    inactive: number;
    newThisMonth: number;
  };
  hubs: {
    total: number;
    active: number;
    pending: number;
  };
  jobs: {
    total: number;
    active: number;
    completed: number;
    inProgress: number;
  };
  contracts: {
    total: number;
    active: number;
    completed: number;
    pending: number;
  };
  proposals: {
    total: number;
    pending: number;
    accepted: number;
    rejected: number;
  };
  experiences: {
    total: number;
    published: number;
    draft: number;
  };
  expertise: {
    total: number;
    published: number;
    draft: number;
  };
}

export interface DashboardStatsResponse {
  success: boolean;
  data: DashboardStats;
}

@Injectable({
  providedIn: 'root'
})
export class DashboardService {
  private http = inject(HttpClient);
  private baseUrl = `${environment.apiUrl}/admin/dashboard`;

  /**
   * Get dashboard statistics
   */
  getStats(): Observable<DashboardStatsResponse> {
    return this.http.get<DashboardStatsResponse>(`${this.baseUrl}/stats`);
  }
}

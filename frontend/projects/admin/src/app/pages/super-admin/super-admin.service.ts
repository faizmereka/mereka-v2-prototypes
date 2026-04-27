import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export type AdminRole = 'superAdmin' | 'platformAdmin';
export type AdminStatus = 'active' | 'inactive' | 'suspended';

export interface Admin {
  _id: string;
  email: string;
  name: string;
  role: AdminRole;
  status: AdminStatus;
  mfaEnabled: boolean;
  requirePasswordChange: boolean;
  lastLoginAt: string | null;
  lastLoginIp: string | null;
  loginAttempts: number;
  lockedUntil: string | null;
  ipWhitelist: string[];
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
}

export interface CreateAdminInput {
  email: string;
  password: string;
  name: string;
  role?: AdminRole;
}

export interface UpdateAdminInput {
  name?: string;
  status?: AdminStatus;
  role?: AdminRole;
  ipWhitelist?: string[];
}

export interface AdminSessionInfo {
  adminId: string;
  name: string;
  email: string;
  lastLoginAt: string | null;
  lastLoginIp: string | null;
  loginAttempts: number;
  lockedUntil: string | null;
  activeSessions: number;
  isLocked: boolean;
}

export interface AdminStats {
  total: number;
  byStatus: {
    active: number;
    inactive: number;
    suspended: number;
  };
  byRole: {
    superAdmin: number;
    platformAdmin: number;
  };
  lockedAccounts: number;
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

@Injectable({
  providedIn: 'root',
})
export class SuperAdminService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/admin/admins`;

  /**
   * Get admin statistics
   */
  getStats(): Observable<ApiResponse<AdminStats>> {
    return this.http.get<ApiResponse<AdminStats>>(`${this.apiUrl}/stats`);
  }

  /**
   * List all admins with filtering
   */
  listAdmins(params?: {
    page?: number;
    limit?: number;
    status?: AdminStatus;
    role?: AdminRole;
    search?: string;
  }): Observable<ApiResponse<Admin[]>> {
    const queryParams: Record<string, string> = {};

    if (params?.page) queryParams['page'] = params.page.toString();
    if (params?.limit) queryParams['limit'] = params.limit.toString();
    if (params?.status) queryParams['status'] = params.status;
    if (params?.role) queryParams['role'] = params.role;
    if (params?.search) queryParams['search'] = params.search;

    return this.http.get<ApiResponse<Admin[]>>(this.apiUrl, { params: queryParams });
  }

  /**
   * Get admin by ID
   */
  getAdminById(id: string): Observable<ApiResponse<Admin>> {
    return this.http.get<ApiResponse<Admin>>(`${this.apiUrl}/${id}`);
  }

  /**
   * Create new admin
   */
  createAdmin(data: CreateAdminInput): Observable<ApiResponse<Admin>> {
    return this.http.post<ApiResponse<Admin>>(this.apiUrl, data);
  }

  /**
   * Update admin
   */
  updateAdmin(id: string, data: UpdateAdminInput): Observable<ApiResponse<Admin>> {
    return this.http.patch<ApiResponse<Admin>>(`${this.apiUrl}/${id}`, data);
  }

  /**
   * Delete/deactivate admin
   */
  deleteAdmin(id: string): Observable<ApiResponse<void>> {
    return this.http.delete<ApiResponse<void>>(`${this.apiUrl}/${id}`);
  }

  /**
   * Get admin session/login info
   */
  getAdminSessions(id: string): Observable<ApiResponse<AdminSessionInfo>> {
    return this.http.get<ApiResponse<AdminSessionInfo>>(`${this.apiUrl}/${id}/sessions`);
  }

  /**
   * Force logout admin from all sessions
   */
  forceLogout(id: string): Observable<ApiResponse<void>> {
    return this.http.post<ApiResponse<void>>(`${this.apiUrl}/${id}/logout`, {});
  }

  /**
   * Unlock admin account
   */
  unlockAdmin(id: string): Observable<ApiResponse<Admin>> {
    return this.http.post<ApiResponse<Admin>>(`${this.apiUrl}/${id}/unlock`, {});
  }
}

import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface Bank {
  _id: string;
  name: string;
  routingNumber?: string;
  logoUrl?: string;
  countryCode: string;
  isActive: boolean;
  approvalStatus: 'pending' | 'approved' | 'rejected';
  createdBy?: string;
  approvedBy?: string;
  approvedAt?: string;
  priority: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateBankInput {
  name: string;
  routingNumber?: string;
  logoUrl?: string;
  countryCode: string;
  priority?: number;
}

export interface UpdateBankInput {
  name?: string;
  routingNumber?: string;
  logoUrl?: string;
  countryCode?: string;
  isActive?: boolean;
  priority?: number;
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
  meta?: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

@Injectable({
  providedIn: 'root'
})
export class BankService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/admin/banks`;

  listBanks(params?: { countryCode?: string; isActive?: string; page?: number; limit?: number }): Observable<ApiResponse<Bank[]>> {
    return this.http.get<ApiResponse<Bank[]>>(this.apiUrl, { params: params as Record<string, string> });
  }

  listActiveBanks(): Observable<ApiResponse<Bank[]>> {
    return this.http.get<ApiResponse<Bank[]>>(`${this.apiUrl}/active`);
  }

  listPendingBanks(): Observable<ApiResponse<Bank[]>> {
    return this.http.get<ApiResponse<Bank[]>>(`${this.apiUrl}/pending`);
  }

  listBanksByCountry(countryCode: string): Observable<ApiResponse<Bank[]>> {
    return this.http.get<ApiResponse<Bank[]>>(`${this.apiUrl}/country/${countryCode}`);
  }

  getBankById(id: string): Observable<ApiResponse<Bank>> {
    return this.http.get<ApiResponse<Bank>>(`${this.apiUrl}/${id}`);
  }

  createBank(data: CreateBankInput): Observable<ApiResponse<Bank>> {
    return this.http.post<ApiResponse<Bank>>(this.apiUrl, data);
  }

  updateBank(id: string, data: UpdateBankInput): Observable<ApiResponse<Bank>> {
    return this.http.patch<ApiResponse<Bank>>(`${this.apiUrl}/${id}`, data);
  }

  deleteBank(id: string): Observable<ApiResponse<void>> {
    return this.http.delete<ApiResponse<void>>(`${this.apiUrl}/${id}`);
  }

  approveBank(id: string): Observable<ApiResponse<Bank>> {
    return this.http.post<ApiResponse<Bank>>(`${this.apiUrl}/${id}/approve`, {});
  }

  rejectBank(id: string): Observable<ApiResponse<void>> {
    return this.http.post<ApiResponse<void>>(`${this.apiUrl}/${id}/reject`, {});
  }
}

import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, tap } from 'rxjs';
import { environment } from '../../../environments/environment';

// Transaction types matching backend enums
export type TransactionType =
  | 'booking_payment'
  | 'milestone_fund'
  | 'timelog_payment'
  | 'milestone_release'
  | 'expert_transfer'
  | 'withdrawal'
  | 'refund'
  | 'transfer_reversal'
  | 'platform_fee';

export type TransactionStatus =
  | 'pending'
  | 'processing'
  | 'succeeded'
  | 'failed'
  | 'refunded'
  | 'partially_refunded'
  | 'cancelled';

export type TransactionDirection = 'inbound' | 'outbound' | 'internal';

export type SourceModel = 'Booking' | 'ContractPayment' | 'Withdrawal' | 'BookingTransaction';

// Withdrawal types matching backend enums
export type WithdrawalStatus = 'pending' | 'in_transit' | 'paid' | 'failed' | 'canceled';

export type SourceType = 'card' | 'fpx' | 'bank_transfer';

// Transaction interface
export interface Transaction {
  _id: string;
  type: TransactionType;
  direction: TransactionDirection;
  sourceModel: SourceModel;
  sourceId: string;
  referenceId: string;
  amount: number;
  currency: string;
  platformFee: number;
  platformFeeRate: number;
  stripeFee: number;
  transferAmount: number;
  status: TransactionStatus;
  description?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  // Populated fields
  fromUser?: {
    _id: string;
    name: string;
    email: string;
  };
  toUser?: {
    _id: string;
    name: string;
    email: string;
  };
  hub?: {
    _id: string;
    name: string;
  };
  // Stripe references
  stripePaymentIntentId?: string;
  stripeChargeId?: string;
  stripeTransferId?: string;
  stripePayoutId?: string;
  stripeRefundId?: string;
  // Refund tracking
  refundedAmount?: number;
  refundedAt?: string;
  refundReason?: string;
  // Error handling
  errorCode?: string;
  errorMessage?: string;
}

// Withdrawal interface
export interface Withdrawal {
  _id: string;
  userId: string;
  stripeAccountId: string;
  stripePayoutId: string;
  amount: number;
  currency: string;
  bankAccountId: string;
  sourceType: SourceType;
  status: WithdrawalStatus;
  description?: string;
  requestedBy: string;
  approvedBy?: string;
  arrivalDate?: string;
  completedDate?: string;
  createdAt: string;
  updatedAt: string;
  // Populated fields
  user?: {
    _id: string;
    name: string;
    email: string;
  };
  bankAccount?: {
    bankName: string;
    accountNumber: string;
    accountHolderName: string;
  };
}

// Stats interfaces
export interface TransactionStats {
  total: number;
  totalVolume: number;
  totalPlatformFees: number;
  byStatus: Record<TransactionStatus, number>;
  byType: Record<TransactionType, number>;
  byDirection: Record<TransactionDirection, number>;
  currency: string;
}

export interface WithdrawalStats {
  total: number;
  totalAmount: number;
  pendingAmount: number;
  completedAmount: number;
  byStatus: Record<WithdrawalStatus, number>;
  bySourceType: Record<SourceType, number>;
  currency: string;
}

export interface FinanceStats {
  transactions: TransactionStats;
  withdrawals: WithdrawalStats;
}

// Pagination interface
export interface Pagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// List response interface (for paginated endpoints)
export interface ListResponse<T> {
  items: T[];
  pagination: Pagination;
}

// API response interface
interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

// List params interfaces
export interface ListTransactionsParams {
  page?: number;
  limit?: number;
  status?: TransactionStatus;
  type?: TransactionType;
  direction?: TransactionDirection;
  search?: string;
  hubId?: string;
  dateFrom?: string;
  dateTo?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface ListWithdrawalsParams {
  page?: number;
  limit?: number;
  status?: WithdrawalStatus;
  sourceType?: SourceType;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

@Injectable({
  providedIn: 'root',
})
export class FinanceService {
  private readonly http = inject(HttpClient);
  private readonly transactionsApiUrl = `${environment.apiUrl}/admin/transactions`;
  private readonly withdrawalsApiUrl = `${environment.apiUrl}/admin/withdrawals`;

  // Cache for stats to prevent refetching on tab changes
  private cachedTransactionStats: ApiResponse<TransactionStats> | null = null;
  private cachedWithdrawalStats: ApiResponse<WithdrawalStats> | null = null;

  // ==================== TRANSACTION METHODS ====================

  /**
   * Get transaction statistics (cached)
   */
  getTransactionStats(): Observable<ApiResponse<TransactionStats>> {
    if (this.cachedTransactionStats) {
      return of(this.cachedTransactionStats);
    }

    return this.http.get<ApiResponse<TransactionStats>>(`${this.transactionsApiUrl}/stats`).pipe(
      tap((response) => {
        if (response.success) {
          this.cachedTransactionStats = response;
        }
      })
    );
  }

  /**
   * Force refresh transaction stats
   */
  refreshTransactionStats(): Observable<ApiResponse<TransactionStats>> {
    this.cachedTransactionStats = null;
    return this.getTransactionStats();
  }

  /**
   * List transactions with filtering and pagination
   */
  listTransactions(params?: ListTransactionsParams): Observable<ApiResponse<ListResponse<Transaction>>> {
    const queryParams: Record<string, string> = {};

    if (params?.page) queryParams['page'] = params.page.toString();
    if (params?.limit) queryParams['limit'] = params.limit.toString();
    if (params?.status) queryParams['status'] = params.status;
    if (params?.type) queryParams['type'] = params.type;
    if (params?.direction) queryParams['direction'] = params.direction;
    if (params?.search) queryParams['search'] = params.search;
    if (params?.hubId) queryParams['hubId'] = params.hubId;
    if (params?.dateFrom) queryParams['dateFrom'] = params.dateFrom;
    if (params?.dateTo) queryParams['dateTo'] = params.dateTo;
    if (params?.sortBy) queryParams['sortBy'] = params.sortBy;
    if (params?.sortOrder) queryParams['sortOrder'] = params.sortOrder;

    return this.http.get<ApiResponse<ListResponse<Transaction>>>(this.transactionsApiUrl, { params: queryParams });
  }

  /**
   * Get transaction by ID
   */
  getTransactionById(id: string): Observable<ApiResponse<Transaction>> {
    return this.http.get<ApiResponse<Transaction>>(`${this.transactionsApiUrl}/${id}`);
  }

  // ==================== WITHDRAWAL METHODS ====================

  /**
   * Get withdrawal statistics (cached)
   */
  getWithdrawalStats(): Observable<ApiResponse<WithdrawalStats>> {
    if (this.cachedWithdrawalStats) {
      return of(this.cachedWithdrawalStats);
    }

    return this.http.get<ApiResponse<WithdrawalStats>>(`${this.withdrawalsApiUrl}/stats`).pipe(
      tap((response) => {
        if (response.success) {
          this.cachedWithdrawalStats = response;
        }
      })
    );
  }

  /**
   * Force refresh withdrawal stats
   */
  refreshWithdrawalStats(): Observable<ApiResponse<WithdrawalStats>> {
    this.cachedWithdrawalStats = null;
    return this.getWithdrawalStats();
  }

  /**
   * List withdrawals with filtering and pagination
   */
  listWithdrawals(params?: ListWithdrawalsParams): Observable<ApiResponse<ListResponse<Withdrawal>>> {
    const queryParams: Record<string, string> = {};

    if (params?.page) queryParams['page'] = params.page.toString();
    if (params?.limit) queryParams['limit'] = params.limit.toString();
    if (params?.status) queryParams['status'] = params.status;
    if (params?.sourceType) queryParams['sourceType'] = params.sourceType;
    if (params?.search) queryParams['search'] = params.search;
    if (params?.dateFrom) queryParams['dateFrom'] = params.dateFrom;
    if (params?.dateTo) queryParams['dateTo'] = params.dateTo;
    if (params?.sortBy) queryParams['sortBy'] = params.sortBy;
    if (params?.sortOrder) queryParams['sortOrder'] = params.sortOrder;

    return this.http.get<ApiResponse<ListResponse<Withdrawal>>>(this.withdrawalsApiUrl, { params: queryParams });
  }

  /**
   * Get withdrawal by ID
   */
  getWithdrawalById(id: string): Observable<ApiResponse<Withdrawal>> {
    return this.http.get<ApiResponse<Withdrawal>>(`${this.withdrawalsApiUrl}/${id}`);
  }

  /**
   * Approve withdrawal
   */
  approveWithdrawal(id: string, note?: string): Observable<ApiResponse<Withdrawal>> {
    return this.http.post<ApiResponse<Withdrawal>>(`${this.withdrawalsApiUrl}/${id}/approve`, { note });
  }

  /**
   * Reject withdrawal
   */
  rejectWithdrawal(id: string, reason: string): Observable<ApiResponse<Withdrawal>> {
    return this.http.post<ApiResponse<Withdrawal>>(`${this.withdrawalsApiUrl}/${id}/reject`, { reason });
  }

  // ==================== COMBINED STATS ====================

  /**
   * Clear all cached stats
   */
  clearCache(): void {
    this.cachedTransactionStats = null;
    this.cachedWithdrawalStats = null;
  }
}

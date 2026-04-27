import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../../environments/environment';
import {
  TransactionType,
  TransactionStatus,
  TransactionDirection,
  type Transaction,
  type StripeAccountStatus,
  type StripeVerificationError,
  type Balance,
  type WithdrawalItem,
  type BankAccount,
  type AddBankAccountRequest,
  type SupportedBank,
} from './hub-transaction.service';

// Re-export for convenience
export { TransactionType, TransactionStatus, TransactionDirection };
export type { Transaction, StripeAccountStatus, StripeVerificationError, Balance, WithdrawalItem, BankAccount, AddBankAccountRequest, SupportedBank };

// Expert-specific types
export interface ExpertEarning {
  _id: string;
  type: TransactionType;
  status: TransactionStatus;
  referenceId: string;
  amount: number;
  currency: string;
  platformFee: number;
  transferAmount: number;
  hubId: string;
  description?: string;
  createdAt: string;
  metadata: {
    hubId?: string;
    hubName?: string;
    contractId?: string;
    milestoneId?: string;
  };
}

export interface EarningsListResponse {
  earnings: ExpertEarning[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
  summary: { totalEarnings: number; totalWithdrawals: number; pendingAmount: number; netEarnings: number };
}

export interface WithdrawalListResponse {
  withdrawals: WithdrawalItem[];
  pagination: { hasMore: boolean; startingAfter?: string };
  summary: { totalWithdrawn: number; pendingWithdrawals: number; lastWithdrawalDate?: string };
}

export interface BankAccountListResponse {
  bankAccounts: BankAccount[];
  defaultBankAccountId?: string;
}

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: { code: string; message: string };
}

@Injectable({ providedIn: 'root' })
export class UserTransactionService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/users/me/transactions`;

  // State
  private readonly _stripeStatus = signal<StripeAccountStatus | null>(null);
  private readonly _balance = signal<Balance | null>(null);
  private readonly _earnings = signal<ExpertEarning[]>([]);
  private readonly _earningsSummary = signal<EarningsListResponse['summary'] | null>(null);
  private readonly _withdrawals = signal<WithdrawalItem[]>([]);
  private readonly _withdrawalSummary = signal<WithdrawalListResponse['summary'] | null>(null);
  private readonly _bankAccounts = signal<BankAccount[]>([]);
  private readonly _defaultBankAccountId = signal<string | null>(null);
  private readonly _loading = signal(false);
  private readonly _error = signal<string | null>(null);
  private readonly _initialized = signal(false);

  // Public signals
  readonly stripeStatus = this._stripeStatus.asReadonly();
  readonly balance = this._balance.asReadonly();
  readonly earnings = this._earnings.asReadonly();
  readonly earningsSummary = this._earningsSummary.asReadonly();
  readonly withdrawals = this._withdrawals.asReadonly();
  readonly withdrawalSummary = this._withdrawalSummary.asReadonly();
  readonly bankAccounts = this._bankAccounts.asReadonly();
  readonly defaultBankAccountId = this._defaultBankAccountId.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();

  // Computed
  readonly hasStripeAccount = computed(() => this._stripeStatus()?.hasAccount ?? false);
  readonly isKycComplete = computed(() => this._stripeStatus()?.connectCompleted ?? false);
  readonly canWithdraw = computed(() => {
    const s = this._stripeStatus();
    const b = this._balance();
    return s?.payoutsEnabled && s?.connectCompleted && (b?.totalAvailable ?? 0) > 0;
  });
  readonly defaultBankAccount = computed(() => {
    const id = this._defaultBankAccountId();
    return this._bankAccounts().find(b => b.id === id) ?? null;
  });
  readonly availableBalance = computed(() => this._balance()?.totalAvailable ?? 0);
  readonly pendingBalance = computed(() => this._balance()?.totalPending ?? 0);

  async loadUserTransactionData(): Promise<void> {
    if (this._initialized() || this._loading()) return;
    await this.fetchAll();
  }

  async refresh(): Promise<void> {
    await this.fetchAll();
  }

  clearCache(): void {
    this._stripeStatus.set(null);
    this._balance.set(null);
    this._earnings.set([]);
    this._earningsSummary.set(null);
    this._withdrawals.set([]);
    this._withdrawalSummary.set(null);
    this._bankAccounts.set([]);
    this._defaultBankAccountId.set(null);
    this._initialized.set(false);
    this._error.set(null);
  }

  private async fetchAll(): Promise<void> {
    this._loading.set(true);
    this._error.set(null);

    try {
      await Promise.all([
        this.getStripeStatus(),
        this.getBalance(),
        this.getEarnings({ limit: 50 }),
        this.getWithdrawals({ limit: 25 }),
        this.getBankAccounts(),
      ]);
      this._initialized.set(true);
    } catch (err) {
      this._error.set('Failed to load earnings data');
    } finally {
      this._loading.set(false);
    }
  }

  async getStripeStatus(): Promise<StripeAccountStatus> {
    const res = await firstValueFrom(
      this.http.get<ApiResponse<StripeAccountStatus>>(`${this.apiUrl}/stripe/status`, { withCredentials: true })
    );
    if (!res.success || !res.data) throw new Error(res.error?.message ?? 'Failed');
    this._stripeStatus.set(res.data);
    return res.data;
  }

  async createStripeAccount(): Promise<{ stripeAccountId: string }> {
    const res = await firstValueFrom(
      this.http.post<ApiResponse<{ stripeAccountId: string }>>(`${this.apiUrl}/stripe/account`, {}, { withCredentials: true })
    );
    if (!res.success || !res.data) throw new Error(res.error?.message ?? 'Failed');
    await this.getStripeStatus();
    return res.data;
  }

  async getOnboardingLink(returnUrl: string, refreshUrl: string): Promise<string> {
    const res = await firstValueFrom(
      this.http.post<ApiResponse<{ url: string }>>(`${this.apiUrl}/stripe/onboarding-link`, { returnUrl, refreshUrl }, { withCredentials: true })
    );
    if (!res.success || !res.data) throw new Error(res.error?.message ?? 'Failed');
    return res.data.url;
  }

  async getDashboardLink(): Promise<string> {
    const res = await firstValueFrom(
      this.http.get<ApiResponse<{ url: string }>>(`${this.apiUrl}/stripe/dashboard-link`, { withCredentials: true })
    );
    if (!res.success || !res.data) throw new Error(res.error?.message ?? 'Failed');
    return res.data.url;
  }

  async getBalance(): Promise<Balance> {
    const res = await firstValueFrom(
      this.http.get<ApiResponse<Balance>>(`${this.apiUrl}/balance`, { withCredentials: true })
    );
    if (!res.success || !res.data) throw new Error(res.error?.message ?? 'Failed');
    this._balance.set(res.data);
    return res.data;
  }

  async getEarnings(params?: { type?: string; status?: string; page?: number; limit?: number }): Promise<EarningsListResponse> {
    const qp = new URLSearchParams();
    if (params?.type) qp.set('type', params.type);
    if (params?.status) qp.set('status', params.status);
    if (params?.page) qp.set('page', params.page.toString());
    if (params?.limit) qp.set('limit', params.limit.toString());

    const url = `${this.apiUrl}${qp.toString() ? `?${qp}` : ''}`;
    const res = await firstValueFrom(
      this.http.get<ApiResponse<EarningsListResponse>>(url, { withCredentials: true })
    );
    if (!res.success || !res.data) throw new Error(res.error?.message ?? 'Failed');
    this._earnings.set(res.data.earnings);
    this._earningsSummary.set(res.data.summary);
    return res.data;
  }

  async exportEarnings(params?: { type?: string; status?: string; startDate?: string; endDate?: string }): Promise<Blob> {
    const qp = new URLSearchParams();
    if (params?.type) qp.set('type', params.type);
    if (params?.status) qp.set('status', params.status);
    if (params?.startDate) qp.set('startDate', params.startDate);
    if (params?.endDate) qp.set('endDate', params.endDate);

    const url = `${this.apiUrl}/export${qp.toString() ? `?${qp}` : ''}`;
    return firstValueFrom(this.http.get(url, { withCredentials: true, responseType: 'blob' }));
  }

  async getWithdrawals(params?: { status?: string; limit?: number }): Promise<WithdrawalListResponse> {
    const qp = new URLSearchParams();
    if (params?.status) qp.set('status', params.status);
    if (params?.limit) qp.set('limit', params.limit.toString());

    const url = `${this.apiUrl}/withdrawals${qp.toString() ? `?${qp}` : ''}`;
    const res = await firstValueFrom(
      this.http.get<ApiResponse<WithdrawalListResponse>>(url, { withCredentials: true })
    );
    if (!res.success || !res.data) throw new Error(res.error?.message ?? 'Failed');
    this._withdrawals.set(res.data.withdrawals);
    this._withdrawalSummary.set(res.data.summary);
    return res.data;
  }

  async createWithdrawal(req: { amount: number; currency?: string; bankAccountId?: string; description?: string }): Promise<WithdrawalItem> {
    const res = await firstValueFrom(
      this.http.post<ApiResponse<WithdrawalItem>>(`${this.apiUrl}/withdrawals`, req, { withCredentials: true })
    );
    if (!res.success || !res.data) throw new Error(res.error?.message ?? 'Failed');
    await Promise.all([this.getBalance(), this.getWithdrawals()]);
    return res.data;
  }

  async getBankAccounts(): Promise<BankAccountListResponse> {
    const res = await firstValueFrom(
      this.http.get<ApiResponse<BankAccountListResponse>>(`${this.apiUrl}/bank-accounts`, { withCredentials: true })
    );
    if (!res.success || !res.data) throw new Error(res.error?.message ?? 'Failed');
    this._bankAccounts.set(res.data.bankAccounts);
    this._defaultBankAccountId.set(res.data.defaultBankAccountId ?? null);
    return res.data;
  }

  async getSupportedBanks(country = 'MY'): Promise<SupportedBank[]> {
    const res = await firstValueFrom(
      this.http.get<ApiResponse<{ banks: SupportedBank[] }>>(`${this.apiUrl}/bank-accounts/supported-banks?country=${country}`, { withCredentials: true })
    );
    if (!res.success || !res.data) throw new Error(res.error?.message ?? 'Failed');
    return res.data.banks;
  }

  async addBankAccount(request: AddBankAccountRequest): Promise<BankAccount> {
    try {
      const res = await firstValueFrom(
        this.http.post<ApiResponse<BankAccount>>(`${this.apiUrl}/bank-accounts`, request, { withCredentials: true })
      );
      if (!res.success || !res.data) throw new Error(res.error?.message ?? 'Failed to add bank account');
      await this.getBankAccounts();
      return res.data;
    } catch (error) {
      // Extract error message from HttpErrorResponse
      if (error && typeof error === 'object') {
        const httpError = error as { error?: { error?: { message?: string }; message?: string }; message?: string };
        const message = httpError.error?.error?.message || httpError.error?.message || httpError.message || 'Failed to add bank account';
        throw new Error(message);
      }
      throw error;
    }
  }

  async setDefaultBankAccount(bankAccountId: string): Promise<BankAccount> {
    const res = await firstValueFrom(
      this.http.post<ApiResponse<BankAccount>>(`${this.apiUrl}/bank-accounts/${bankAccountId}/default`, {}, { withCredentials: true })
    );
    if (!res.success || !res.data) throw new Error(res.error?.message ?? 'Failed');
    await this.getBankAccounts();
    return res.data;
  }

  async deleteBankAccount(bankAccountId: string): Promise<void> {
    const res = await firstValueFrom(
      this.http.delete<ApiResponse<unknown>>(`${this.apiUrl}/bank-accounts/${bankAccountId}`, { withCredentials: true })
    );
    if (!res.success) throw new Error(res.error?.message ?? 'Failed');
    await this.getBankAccounts();
  }
}

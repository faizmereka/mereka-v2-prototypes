import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { AuthStateService } from '../../../core/services/auth-state.service';

// ============================================================================
// Enums - Match backend Transaction model
// ============================================================================

export enum TransactionType {
  BOOKING_PAYMENT = 'booking_payment',
  MILESTONE_FUND = 'milestone_fund',
  TIMELOG_PAYMENT = 'timelog_payment',
  MILESTONE_RELEASE = 'milestone_release',
  EXPERT_TRANSFER = 'expert_transfer',
  WITHDRAWAL = 'withdrawal',
  REFUND = 'refund',
  TRANSFER_REVERSAL = 'transfer_reversal',
  PLATFORM_FEE = 'platform_fee',
}

export enum TransactionStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  SUCCEEDED = 'succeeded',
  FAILED = 'failed',
  REFUNDED = 'refunded',
  PARTIALLY_REFUNDED = 'partially_refunded',
  CANCELLED = 'cancelled',
}

export enum TransactionDirection {
  INBOUND = 'inbound',
  OUTBOUND = 'outbound',
  INTERNAL = 'internal',
}

// ============================================================================
// Interfaces - Match backend models
// ============================================================================

export interface Transaction {
  _id: string;
  type: TransactionType;
  direction: TransactionDirection;
  status: TransactionStatus;
  referenceId: string;
  amount: number;
  currency: string;
  platformFee: number;
  platformFeeRate: number;
  stripeFee: number;
  transferAmount: number;
  fromUserId?: string;
  toUserId?: string;
  hubId: string;
  serviceType?: 'experience' | 'expertise' | 'space' | 'milestone' | 'timelog';
  serviceId?: string;
  description?: string;
  refundedAmount?: number;
  refundedAt?: string;
  refundReason?: string;
  createdAt: string;
  updatedAt: string;
  // Populated fields
  fromUser?: { _id: string; displayName: string; email: string };
  toUser?: { _id: string; displayName: string; email: string };
  service?: { _id: string; title: string };
}

export interface StripeVerificationError {
  code: string;
  reason: string;
  requirement: string;
}

export interface StripeAccountStatus {
  hasAccount: boolean;
  stripeAccountId?: string;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  detailsSubmitted: boolean;
  connectCompleted: boolean;
  showMyEarnings?: boolean;
  /** Hub's currency based on country (e.g., 'MYR', 'IDR') */
  hubCurrency?: string;
  /** Stripe Connect account's default currency */
  stripeAccountCurrency?: string;
  /** True if hub currency doesn't match Stripe account currency */
  currencyMismatch?: boolean;
  requirements: {
    currentlyDue: string[];
    eventuallyDue: string[];
    pastDue: string[];
    disabledReason?: string;
    errors?: StripeVerificationError[];
  };
}

export interface Balance {
  available: { amount: number; currency: string }[];
  pending: { amount: number; currency: string }[];
  totalAvailable: number;
  totalPending: number;
  currency: string;
}

export interface TransactionListResponse {
  transactions: Transaction[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  summary: {
    totalInbound: number;
    totalOutbound: number;
    totalRefunds: number;
    netAmount: number;
  };
}

export interface WithdrawalItem {
  id: string;
  amount: number;
  currency: string;
  status: 'pending' | 'in_transit' | 'paid' | 'failed' | 'cancelled';
  arrivalDate: string;
  bankAccountLast4: string;
  bankName?: string;
  description?: string;
  failureMessage?: string;
  createdAt: string;
}

export interface WithdrawalListResponse {
  withdrawals: WithdrawalItem[];
  pagination: {
    hasMore: boolean;
    startingAfter?: string;
  };
  summary: {
    totalWithdrawn: number;
    pendingWithdrawals: number;
    lastWithdrawalDate?: string;
  };
}

export interface BankAccount {
  id: string;
  bankName: string;
  last4: string;
  accountHolderName: string;
  accountHolderType: 'individual' | 'company';
  currency: string;
  country: string;
  isDefault: boolean;
  status: 'new' | 'validated' | 'verified' | 'verification_failed' | 'errored';
}

export interface BankAccountListResponse {
  bankAccounts: BankAccount[];
  defaultBankAccountId?: string;
}

export interface CreateWithdrawalRequest {
  amount: number;
  currency?: string;
  bankAccountId?: string;
  description?: string;
}

export interface AddBankAccountRequest {
  accountNumber: string;
  routingNumber: string;
  accountHolderName: string;
  accountHolderType: 'individual' | 'company';
  currency?: string;
  country?: string;
  setAsDefault?: boolean;
}

export interface SupportedBank {
  code: string;
  name: string;
}

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: { code: string; message: string };
}

// ============================================================================
// Hub Transaction Service
// ============================================================================

@Injectable({ providedIn: 'root' })
export class HubTransactionService {
  private readonly http = inject(HttpClient);
  private readonly authState = inject(AuthStateService);

  private getApiUrl(hubId: string): string {
    return `${environment.apiUrl}/hub/${hubId}/transactions`;
  }

  // State Signals
  private readonly _stripeStatus = signal<StripeAccountStatus | null>(null);
  private readonly _balance = signal<Balance | null>(null);
  private readonly _transactions = signal<Transaction[]>([]);
  private readonly _transactionSummary = signal<TransactionListResponse['summary'] | null>(null);
  private readonly _withdrawals = signal<WithdrawalItem[]>([]);
  private readonly _withdrawalSummary = signal<WithdrawalListResponse['summary'] | null>(null);
  private readonly _bankAccounts = signal<BankAccount[]>([]);
  private readonly _defaultBankAccountId = signal<string | null>(null);
  private readonly _loading = signal(false);
  private readonly _error = signal<string | null>(null);
  private readonly _initialized = signal(false);
  private readonly _cachedHubId = signal<string | null>(null);

  // Public Readonly Signals
  readonly stripeStatus = this._stripeStatus.asReadonly();
  readonly balance = this._balance.asReadonly();
  readonly transactions = this._transactions.asReadonly();
  readonly transactionSummary = this._transactionSummary.asReadonly();
  readonly withdrawals = this._withdrawals.asReadonly();
  readonly withdrawalSummary = this._withdrawalSummary.asReadonly();
  readonly bankAccounts = this._bankAccounts.asReadonly();
  readonly defaultBankAccountId = this._defaultBankAccountId.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();
  readonly initialized = this._initialized.asReadonly();

  // Computed Signals
  readonly hasStripeAccount = computed(() => this._stripeStatus()?.hasAccount ?? false);
  readonly isKycComplete = computed(() => this._stripeStatus()?.connectCompleted ?? false);
  readonly showMyEarnings = computed(() => this._stripeStatus()?.showMyEarnings ?? false);
  readonly canWithdraw = computed(() => {
    const status = this._stripeStatus();
    const balance = this._balance();
    return status?.payoutsEnabled && status?.connectCompleted && (balance?.totalAvailable ?? 0) > 0;
  });
  readonly defaultBankAccount = computed(() => {
    const defaultId = this._defaultBankAccountId();
    return this._bankAccounts().find((b) => b.id === defaultId) ?? null;
  });
  readonly availableBalance = computed(() => this._balance()?.totalAvailable ?? 0);
  readonly pendingBalance = computed(() => this._balance()?.totalPending ?? 0);

  // Filtered transactions
  readonly salesTransactions = computed(() =>
    this._transactions().filter((t) => t.type === TransactionType.BOOKING_PAYMENT && t.direction === TransactionDirection.INBOUND)
  );
  readonly refundTransactions = computed(() =>
    this._transactions().filter((t) => t.type === TransactionType.REFUND)
  );
  readonly withdrawalTransactions = computed(() =>
    this._transactions().filter((t) => t.type === TransactionType.WITHDRAWAL)
  );

  // ============================================================================
  // Data Loading
  // ============================================================================

  async loadTransactionData(): Promise<void> {
    const currentHubId = this.authState.selectedHub()?.id;
    if (!currentHubId) return;

    if (this._initialized() && this._cachedHubId() === currentHubId) return;
    if (this._loading()) return;

    if (this._cachedHubId() !== currentHubId) {
      this.clearCache();
    }

    await this.fetchAllData();
  }

  async refresh(): Promise<void> {
    await this.fetchAllData();
  }

  clearCache(): void {
    this._stripeStatus.set(null);
    this._balance.set(null);
    this._transactions.set([]);
    this._transactionSummary.set(null);
    this._withdrawals.set([]);
    this._withdrawalSummary.set(null);
    this._bankAccounts.set([]);
    this._defaultBankAccountId.set(null);
    this._initialized.set(false);
    this._cachedHubId.set(null);
    this._error.set(null);
  }

  private async fetchAllData(): Promise<void> {
    const hubId = this.authState.selectedHub()?.id;
    if (!hubId) {
      this._error.set('No hub selected');
      return;
    }

    this._loading.set(true);
    this._error.set(null);

    try {
      await Promise.all([
        this.getStripeStatus(),
        this.getBalance(),
        this.getTransactions({ limit: 50 }),
        this.getWithdrawals({ limit: 25 }),
        this.getBankAccounts(),
      ]);
      this._cachedHubId.set(hubId);
      this._initialized.set(true);
    } catch (error) {
      console.error('Failed to fetch transaction data:', error);
      this._error.set('Failed to load transaction data');
    } finally {
      this._loading.set(false);
    }
  }

  // ============================================================================
  // Stripe Account Methods
  // ============================================================================

  async getStripeStatus(): Promise<StripeAccountStatus> {
    const hubId = this.authState.selectedHub()?.id;
    if (!hubId) throw new Error('No hub selected');

    const response = await firstValueFrom(
      this.http.get<ApiResponse<StripeAccountStatus>>(`${this.getApiUrl(hubId)}/stripe/status`, { withCredentials: true })
    );
    if (!response.success || !response.data) throw new Error(response.error?.message ?? 'Failed to get Stripe status');

    this._stripeStatus.set(response.data);
    return response.data;
  }

  async createStripeAccount(): Promise<{ stripeAccountId: string }> {
    const hubId = this.authState.selectedHub()?.id;
    if (!hubId) throw new Error('No hub selected');

    const response = await firstValueFrom(
      this.http.post<ApiResponse<{ stripeAccountId: string }>>(`${this.getApiUrl(hubId)}/stripe/account`, {}, { withCredentials: true })
    );
    if (!response.success || !response.data) throw new Error(response.error?.message ?? 'Failed to create Stripe account');

    await this.getStripeStatus();
    return response.data;
  }

  async getOnboardingLink(returnUrl: string, refreshUrl: string): Promise<string> {
    const hubId = this.authState.selectedHub()?.id;
    if (!hubId) throw new Error('No hub selected');

    const response = await firstValueFrom(
      this.http.post<ApiResponse<{ url: string }>>(`${this.getApiUrl(hubId)}/stripe/onboarding-link`, { returnUrl, refreshUrl }, { withCredentials: true })
    );
    if (!response.success || !response.data) throw new Error(response.error?.message ?? 'Failed to get onboarding link');

    return response.data.url;
  }

  async getDashboardLink(): Promise<string> {
    const hubId = this.authState.selectedHub()?.id;
    if (!hubId) throw new Error('No hub selected');

    const response = await firstValueFrom(
      this.http.get<ApiResponse<{ url: string }>>(`${this.getApiUrl(hubId)}/stripe/dashboard-link`, { withCredentials: true })
    );
    if (!response.success || !response.data) throw new Error(response.error?.message ?? 'Failed to get dashboard link');

    return response.data.url;
  }

  // ============================================================================
  // Balance & Transaction Methods
  // ============================================================================

  async getBalance(): Promise<Balance> {
    const hubId = this.authState.selectedHub()?.id;
    if (!hubId) throw new Error('No hub selected');

    const response = await firstValueFrom(
      this.http.get<ApiResponse<Balance>>(`${this.getApiUrl(hubId)}/balance`, { withCredentials: true })
    );
    if (!response.success || !response.data) throw new Error(response.error?.message ?? 'Failed to get balance');

    this._balance.set(response.data);
    return response.data;
  }

  async getTransactions(params?: {
    type?: string;
    status?: string;
    direction?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
  }): Promise<TransactionListResponse> {
    const hubId = this.authState.selectedHub()?.id;
    if (!hubId) throw new Error('No hub selected');

    const queryParams = new URLSearchParams();
    if (params?.type) queryParams.set('type', params.type);
    if (params?.status) queryParams.set('status', params.status);
    if (params?.direction) queryParams.set('direction', params.direction);
    if (params?.startDate) queryParams.set('startDate', params.startDate);
    if (params?.endDate) queryParams.set('endDate', params.endDate);
    if (params?.page) queryParams.set('page', params.page.toString());
    if (params?.limit) queryParams.set('limit', params.limit.toString());

    const url = `${this.getApiUrl(hubId)}${queryParams.toString() ? `?${queryParams}` : ''}`;
    const response = await firstValueFrom(
      this.http.get<ApiResponse<TransactionListResponse>>(url, { withCredentials: true })
    );
    if (!response.success || !response.data) throw new Error(response.error?.message ?? 'Failed to get transactions');

    this._transactions.set(response.data.transactions);
    this._transactionSummary.set(response.data.summary);
    return response.data;
  }

  async exportTransactions(params?: { type?: string; status?: string; startDate?: string; endDate?: string }): Promise<Blob> {
    const hubId = this.authState.selectedHub()?.id;
    if (!hubId) throw new Error('No hub selected');

    const queryParams = new URLSearchParams();
    if (params?.type) queryParams.set('type', params.type);
    if (params?.status) queryParams.set('status', params.status);
    if (params?.startDate) queryParams.set('startDate', params.startDate);
    if (params?.endDate) queryParams.set('endDate', params.endDate);

    const url = `${this.getApiUrl(hubId)}/export${queryParams.toString() ? `?${queryParams}` : ''}`;
    return firstValueFrom(this.http.get(url, { withCredentials: true, responseType: 'blob' }));
  }

  // ============================================================================
  // Withdrawal Methods
  // ============================================================================

  async getWithdrawals(params?: { status?: string; limit?: number; startingAfter?: string }): Promise<WithdrawalListResponse> {
    const hubId = this.authState.selectedHub()?.id;
    if (!hubId) throw new Error('No hub selected');

    const queryParams = new URLSearchParams();
    if (params?.status) queryParams.set('status', params.status);
    if (params?.limit) queryParams.set('limit', params.limit.toString());
    if (params?.startingAfter) queryParams.set('startingAfter', params.startingAfter);

    const url = `${this.getApiUrl(hubId)}/withdrawals${queryParams.toString() ? `?${queryParams}` : ''}`;
    const response = await firstValueFrom(
      this.http.get<ApiResponse<WithdrawalListResponse>>(url, { withCredentials: true })
    );
    if (!response.success || !response.data) throw new Error(response.error?.message ?? 'Failed to get withdrawals');

    this._withdrawals.set(response.data.withdrawals);
    this._withdrawalSummary.set(response.data.summary);
    return response.data;
  }

  async createWithdrawal(request: CreateWithdrawalRequest): Promise<WithdrawalItem> {
    const hubId = this.authState.selectedHub()?.id;
    if (!hubId) throw new Error('No hub selected');

    const response = await firstValueFrom(
      this.http.post<ApiResponse<WithdrawalItem>>(`${this.getApiUrl(hubId)}/withdrawals`, request, { withCredentials: true })
    );
    if (!response.success || !response.data) throw new Error(response.error?.message ?? 'Failed to create withdrawal');

    await Promise.all([this.getBalance(), this.getWithdrawals()]);
    return response.data;
  }

  async cancelWithdrawal(withdrawalId: string): Promise<void> {
    const hubId = this.authState.selectedHub()?.id;
    if (!hubId) throw new Error('No hub selected');

    const response = await firstValueFrom(
      this.http.delete<ApiResponse<unknown>>(`${this.getApiUrl(hubId)}/withdrawals/${withdrawalId}`, { withCredentials: true })
    );
    if (!response.success) throw new Error(response.error?.message ?? 'Failed to cancel withdrawal');

    await Promise.all([this.getBalance(), this.getWithdrawals()]);
  }

  // ============================================================================
  // Bank Account Methods
  // ============================================================================

  async getBankAccounts(): Promise<BankAccountListResponse> {
    const hubId = this.authState.selectedHub()?.id;
    if (!hubId) throw new Error('No hub selected');

    const response = await firstValueFrom(
      this.http.get<ApiResponse<BankAccountListResponse>>(`${this.getApiUrl(hubId)}/bank-accounts`, { withCredentials: true })
    );
    if (!response.success || !response.data) throw new Error(response.error?.message ?? 'Failed to get bank accounts');

    this._bankAccounts.set(response.data.bankAccounts);
    this._defaultBankAccountId.set(response.data.defaultBankAccountId ?? null);
    return response.data;
  }

  async getSupportedBanks(): Promise<SupportedBank[]> {
    const hubId = this.authState.selectedHub()?.id;
    if (!hubId) throw new Error('No hub selected');

    const response = await firstValueFrom(
      this.http.get<ApiResponse<{ banks: SupportedBank[] }>>(`${this.getApiUrl(hubId)}/bank-accounts/supported-banks`, { withCredentials: true })
    );
    if (!response.success || !response.data) throw new Error(response.error?.message ?? 'Failed to get supported banks');

    return response.data.banks;
  }

  async addBankAccount(request: AddBankAccountRequest): Promise<BankAccount> {
    const hubId = this.authState.selectedHub()?.id;
    if (!hubId) throw new Error('No hub selected');

    const response = await firstValueFrom(
      this.http.post<ApiResponse<BankAccount>>(`${this.getApiUrl(hubId)}/bank-accounts`, request, { withCredentials: true })
    );
    if (!response.success || !response.data) throw new Error(response.error?.message ?? 'Failed to add bank account');

    await this.getBankAccounts();
    return response.data;
  }

  async setDefaultBankAccount(bankAccountId: string): Promise<BankAccount> {
    const hubId = this.authState.selectedHub()?.id;
    if (!hubId) throw new Error('No hub selected');

    const response = await firstValueFrom(
      this.http.post<ApiResponse<BankAccount>>(`${this.getApiUrl(hubId)}/bank-accounts/${bankAccountId}/default`, {}, { withCredentials: true })
    );
    if (!response.success || !response.data) throw new Error(response.error?.message ?? 'Failed to set default bank account');

    await this.getBankAccounts();
    return response.data;
  }

  async deleteBankAccount(bankAccountId: string): Promise<void> {
    const hubId = this.authState.selectedHub()?.id;
    if (!hubId) throw new Error('No hub selected');

    const response = await firstValueFrom(
      this.http.delete<ApiResponse<unknown>>(`${this.getApiUrl(hubId)}/bank-accounts/${bankAccountId}`, { withCredentials: true })
    );
    if (!response.success) throw new Error(response.error?.message ?? 'Failed to delete bank account');

    await this.getBankAccounts();
  }

  // ============================================================================
  // Utility Methods
  // ============================================================================

  formatCurrency(amount: number, currency = 'MYR'): string {
    // Backend returns actual amounts, not cents
    return new Intl.NumberFormat('en-MY', { style: 'currency', currency }).format(amount);
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('en-MY', { year: 'numeric', month: 'short', day: 'numeric' });
  }

  getStatusClass(status: string): string {
    switch (status) {
      case TransactionStatus.SUCCEEDED:
      case 'paid':
      case 'verified':
        return 'bg-green-100 text-green-800';
      case TransactionStatus.PENDING:
      case TransactionStatus.PROCESSING:
      case 'in_transit':
        return 'bg-yellow-100 text-yellow-800';
      case TransactionStatus.FAILED:
      case TransactionStatus.CANCELLED:
        return 'bg-red-100 text-red-800';
      case TransactionStatus.REFUNDED:
      case TransactionStatus.PARTIALLY_REFUNDED:
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-neutral-100 text-neutral-800';
    }
  }

  getTypeLabel(type: TransactionType | string): string {
    switch (type) {
      case TransactionType.BOOKING_PAYMENT:
        return 'Booking Payment';
      case TransactionType.MILESTONE_FUND:
        return 'Milestone Funded';
      case TransactionType.TIMELOG_PAYMENT:
        return 'Timelog Payment';
      case TransactionType.MILESTONE_RELEASE:
        return 'Milestone Released';
      case TransactionType.EXPERT_TRANSFER:
        return 'Expert Transfer';
      case TransactionType.WITHDRAWAL:
        return 'Withdrawal';
      case TransactionType.REFUND:
        return 'Refund';
      case TransactionType.TRANSFER_REVERSAL:
        return 'Transfer Reversal';
      case TransactionType.PLATFORM_FEE:
        return 'Platform Fee';
      default:
        return type;
    }
  }

  getServiceTypeLabel(serviceType?: string): string {
    switch (serviceType) {
      case 'experience':
        return 'Experience';
      case 'expertise':
        return 'Expertise';
      case 'space':
        return 'Space';
      case 'milestone':
        return 'Milestone';
      case 'timelog':
        return 'Timelog';
      default:
        return serviceType ?? '';
    }
  }
}

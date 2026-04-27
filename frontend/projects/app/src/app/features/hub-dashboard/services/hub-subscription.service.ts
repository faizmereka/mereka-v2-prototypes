import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { AuthStateService } from '../../../core/services/auth-state.service';

// ============================================================================
// Types
// ============================================================================

export interface PlanInfo {
  planCode: string;
  name: string;
  tagline: string;
  price: number;
  currency: string;
  features: string[];
  isCurrent: boolean;
}

export interface SubscriptionInfo {
  id: string;
  status: 'active' | 'trialing' | 'past_due' | 'cancelled';
  currentPlan: PlanInfo;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  nextBillingDate: string;
  cancelAtPeriodEnd: boolean;
}

export interface SubscriptionSettingsData {
  subscription: SubscriptionInfo | null;
  availablePlans: PlanInfo[];
}

export interface PlanChangePreview {
  currentPlan: {
    code: string;
    name: string;
    price: number;
  };
  newPlan: {
    code: string;
    name: string;
    price: number;
  };
  proration: {
    amount: number;
    description: string;
  };
  nextBillingAmount: number;
  effectiveDate: string;
}

export interface PlanChangeResult {
  success: boolean;
  subscription: SubscriptionInfo;
  message: string;
}

export interface PaymentMethodInfo {
  id: string;
  type: 'card' | 'bank';
  brand: string;
  last4: string;
  expMonth?: number;
  expYear?: number;
  isDefault: boolean;
}

export interface InvoiceInfo {
  id: string;
  number: string | null;
  description: string;
  amount: number;
  currency: string;
  status: 'paid' | 'pending' | 'overdue' | 'draft' | 'void';
  date: string;
  dueDate: string | null;
  pdfUrl: string | null;
  hostedInvoiceUrl: string | null;
}

export interface UpcomingPaymentInfo {
  amount: number;
  currency: string;
  dueDate: string;
  description: string;
}

export interface TrialInfo {
  isTrialing: boolean;
  trialStart: string | null;
  trialEnd: string | null;
  daysRemaining: number;
}

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}

// ============================================================================
// Hub Subscription Service
// ============================================================================

@Injectable({ providedIn: 'root' })
export class HubSubscriptionService {
  private readonly http = inject(HttpClient);
  private readonly authState = inject(AuthStateService);

  private getApiUrl(hubId: string): string {
    return `${environment.apiUrl}/hub/${hubId}/settings/subscription`;
  }

  // ============================================================================
  // State Signals
  // ============================================================================

  private readonly _subscription = signal<SubscriptionInfo | null>(null);
  private readonly _availablePlans = signal<PlanInfo[]>([]);
  private readonly _loading = signal(false);
  private readonly _error = signal<string | null>(null);
  private readonly _initialized = signal(false);
  private readonly _cachedHubId = signal<string | null>(null);

  // ============================================================================
  // Public Readonly Signals
  // ============================================================================

  readonly subscription = this._subscription.asReadonly();
  readonly availablePlans = this._availablePlans.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();
  readonly initialized = this._initialized.asReadonly();

  // ============================================================================
  // Computed Signals
  // ============================================================================

  readonly currentPlan = computed(() => this._subscription()?.currentPlan ?? null);
  readonly hasActiveSubscription = computed(() => {
    const sub = this._subscription();
    return sub !== null && ['active', 'trialing'].includes(sub.status);
  });
  readonly isCancelScheduled = computed(() => this._subscription()?.cancelAtPeriodEnd ?? false);

  readonly otherPlans = computed(() => {
    const currentPlanCode = this._subscription()?.currentPlan?.planCode;
    return this._availablePlans().filter(p => p.planCode !== currentPlanCode);
  });

  // ============================================================================
  // Public Methods
  // ============================================================================

  /**
   * Load subscription settings - uses cache if available for current hub
   */
  async loadSubscriptionSettings(): Promise<void> {
    const currentHubId = this.authState.selectedHub()?.id;

    if (this._initialized() && this._cachedHubId() === currentHubId) {
      return;
    }

    if (this._loading()) {
      return;
    }

    if (this._cachedHubId() !== currentHubId) {
      this.clearCache();
    }

    await this.fetchSubscriptionSettings();
  }

  /**
   * Force refresh subscription data
   */
  async refresh(): Promise<void> {
    await this.fetchSubscriptionSettings();
  }

  /**
   * Clear cached data
   */
  clearCache(): void {
    this._subscription.set(null);
    this._availablePlans.set([]);
    this._initialized.set(false);
    this._cachedHubId.set(null);
    this._error.set(null);
  }

  /**
   * Preview plan change (get proration details)
   */
  async previewPlanChange(newPlanCode: string): Promise<PlanChangePreview | null> {
    const hubId = this.authState.selectedHub()?.id;
    if (!hubId) {
      throw new Error('No hub selected');
    }

    try {
      const response = await firstValueFrom(
        this.http.post<ApiResponse<PlanChangePreview>>(
          `${this.getApiUrl(hubId)}/preview`,
          { newPlanCode },
          { withCredentials: true }
        )
      );

      if (!response.success) {
        throw new Error(response.error?.message ?? 'Failed to preview plan change');
      }

      return response.data ?? null;
    } catch (error) {
      console.error('Failed to preview plan change:', error);
      throw error;
    }
  }

  /**
   * Change subscription plan
   */
  async changePlan(newPlanCode: string): Promise<PlanChangeResult> {
    const hubId = this.authState.selectedHub()?.id;
    if (!hubId) {
      throw new Error('No hub selected');
    }

    try {
      const response = await firstValueFrom(
        this.http.post<ApiResponse<PlanChangeResult>>(
          `${this.getApiUrl(hubId)}/change-plan`,
          { newPlanCode },
          { withCredentials: true }
        )
      );

      if (!response.success || !response.data) {
        throw new Error(response.error?.message ?? 'Failed to change plan');
      }

      // Update local state
      this._subscription.set(response.data.subscription);

      // Update available plans isCurrent flag
      this._availablePlans.update(plans =>
        plans.map(p => ({
          ...p,
          isCurrent: p.planCode === newPlanCode,
        }))
      );

      return response.data;
    } catch (error) {
      console.error('Failed to change plan:', error);
      throw error;
    }
  }

  /**
   * Cancel subscription
   */
  async cancelSubscription(): Promise<{ message: string; cancelAt: string }> {
    const hubId = this.authState.selectedHub()?.id;
    if (!hubId) {
      throw new Error('No hub selected');
    }

    try {
      const response = await firstValueFrom(
        this.http.post<ApiResponse<{ message: string; cancelAt: string }>>(
          `${this.getApiUrl(hubId)}/cancel`,
          {},
          { withCredentials: true }
        )
      );

      if (!response.success || !response.data) {
        throw new Error(response.error?.message ?? 'Failed to cancel subscription');
      }

      // Update local state
      this._subscription.update(sub =>
        sub ? { ...sub, cancelAtPeriodEnd: true } : null
      );

      return response.data;
    } catch (error) {
      console.error('Failed to cancel subscription:', error);
      throw error;
    }
  }

  /**
   * Reactivate cancelled subscription
   */
  async reactivateSubscription(): Promise<{ message: string }> {
    const hubId = this.authState.selectedHub()?.id;
    if (!hubId) {
      throw new Error('No hub selected');
    }

    try {
      const response = await firstValueFrom(
        this.http.post<ApiResponse<{ message: string }>>(
          `${this.getApiUrl(hubId)}/reactivate`,
          {},
          { withCredentials: true }
        )
      );

      if (!response.success || !response.data) {
        throw new Error(response.error?.message ?? 'Failed to reactivate subscription');
      }

      // Update local state
      this._subscription.update(sub =>
        sub ? { ...sub, cancelAtPeriodEnd: false } : null
      );

      return response.data;
    } catch (error) {
      console.error('Failed to reactivate subscription:', error);
      throw error;
    }
  }

  // ============================================================================
  // Payment Methods
  // ============================================================================

  /**
   * Get payment methods
   */
  async getPaymentMethods(): Promise<{ paymentMethods: PaymentMethodInfo[]; stripeCustomerId: string }> {
    const hubId = this.authState.selectedHub()?.id;
    if (!hubId) {
      throw new Error('No hub selected');
    }

    try {
      const response = await firstValueFrom(
        this.http.get<ApiResponse<{ paymentMethods: PaymentMethodInfo[]; stripeCustomerId: string }>>(
          `${this.getApiUrl(hubId)}/payment-methods`,
          { withCredentials: true }
        )
      );

      if (!response.success || !response.data) {
        throw new Error(response.error?.message ?? 'Failed to get payment methods');
      }

      return response.data;
    } catch (error) {
      console.error('Failed to get payment methods:', error);
      throw error;
    }
  }

  /**
   * Create setup intent for adding new payment method
   * Returns client secret and publishable key for Stripe Elements
   */
  async createSetupIntent(): Promise<{ clientSecret: string; publishableKey: string }> {
    const hubId = this.authState.selectedHub()?.id;
    if (!hubId) {
      throw new Error('No hub selected');
    }

    try {
      const response = await firstValueFrom(
        this.http.post<ApiResponse<{ clientSecret: string; publishableKey: string }>>(
          `${this.getApiUrl(hubId)}/payment-methods/setup-intent`,
          {},
          { withCredentials: true }
        )
      );

      if (!response.success || !response.data) {
        throw new Error(response.error?.message ?? 'Failed to create setup intent');
      }

      return {
        clientSecret: response.data.clientSecret,
        publishableKey: response.data.publishableKey,
      };
    } catch (error) {
      console.error('Failed to create setup intent:', error);
      throw error;
    }
  }

  /**
   * Set default payment method
   */
  async setDefaultPaymentMethod(paymentMethodId: string): Promise<void> {
    const hubId = this.authState.selectedHub()?.id;
    if (!hubId) {
      throw new Error('No hub selected');
    }

    try {
      const response = await firstValueFrom(
        this.http.post<ApiResponse<{ success: boolean }>>(
          `${this.getApiUrl(hubId)}/payment-methods/set-default`,
          { paymentMethodId },
          { withCredentials: true }
        )
      );

      if (!response.success) {
        throw new Error(response.error?.message ?? 'Failed to set default payment method');
      }
    } catch (error) {
      console.error('Failed to set default payment method:', error);
      throw error;
    }
  }

  /**
   * Delete payment method
   */
  async deletePaymentMethod(paymentMethodId: string): Promise<void> {
    const hubId = this.authState.selectedHub()?.id;
    if (!hubId) {
      throw new Error('No hub selected');
    }

    try {
      const response = await firstValueFrom(
        this.http.delete<ApiResponse<{ success: boolean }>>(
          `${this.getApiUrl(hubId)}/payment-methods/${paymentMethodId}`,
          { withCredentials: true }
        )
      );

      if (!response.success) {
        throw new Error(response.error?.message ?? 'Failed to delete payment method');
      }
    } catch (error) {
      console.error('Failed to delete payment method:', error);
      throw error;
    }
  }

  // ============================================================================
  // Invoices
  // ============================================================================

  /**
   * Get invoices
   */
  async getInvoices(params?: { limit?: number; startingAfter?: string }): Promise<{
    invoices: InvoiceInfo[];
    hasMore: boolean;
  }> {
    const hubId = this.authState.selectedHub()?.id;
    if (!hubId) {
      throw new Error('No hub selected');
    }

    try {
      const queryParams = new URLSearchParams();
      if (params?.limit) queryParams.set('limit', params.limit.toString());
      if (params?.startingAfter) queryParams.set('startingAfter', params.startingAfter);

      const url = `${this.getApiUrl(hubId)}/invoices${queryParams.toString() ? `?${queryParams}` : ''}`;

      const response = await firstValueFrom(
        this.http.get<ApiResponse<{ invoices: InvoiceInfo[]; hasMore: boolean }>>(
          url,
          { withCredentials: true }
        )
      );

      if (!response.success || !response.data) {
        throw new Error(response.error?.message ?? 'Failed to get invoices');
      }

      return response.data;
    } catch (error) {
      console.error('Failed to get invoices:', error);
      throw error;
    }
  }

  /**
   * Get invoice download URL
   */
  async getInvoiceDownloadUrl(invoiceId: string): Promise<string> {
    const hubId = this.authState.selectedHub()?.id;
    if (!hubId) {
      throw new Error('No hub selected');
    }

    try {
      const response = await firstValueFrom(
        this.http.get<ApiResponse<{ url: string }>>(
          `${this.getApiUrl(hubId)}/invoices/${invoiceId}/download`,
          { withCredentials: true }
        )
      );

      if (!response.success || !response.data) {
        throw new Error(response.error?.message ?? 'Failed to get invoice download URL');
      }

      return response.data.url;
    } catch (error) {
      console.error('Failed to get invoice download URL:', error);
      throw error;
    }
  }

  // ============================================================================
  // Upcoming Payment & Trial Info
  // ============================================================================

  /**
   * Get upcoming payment info
   */
  async getUpcomingPayment(): Promise<UpcomingPaymentInfo | null> {
    const hubId = this.authState.selectedHub()?.id;
    if (!hubId) {
      throw new Error('No hub selected');
    }

    try {
      const response = await firstValueFrom(
        this.http.get<ApiResponse<{ upcomingPayment: UpcomingPaymentInfo | null }>>(
          `${this.getApiUrl(hubId)}/upcoming-payment`,
          { withCredentials: true }
        )
      );

      if (!response.success) {
        throw new Error(response.error?.message ?? 'Failed to get upcoming payment');
      }

      return response.data?.upcomingPayment ?? null;
    } catch (error) {
      console.error('Failed to get upcoming payment:', error);
      throw error;
    }
  }

  /**
   * Get trial info
   */
  async getTrialInfo(): Promise<TrialInfo> {
    const hubId = this.authState.selectedHub()?.id;
    if (!hubId) {
      throw new Error('No hub selected');
    }

    try {
      const response = await firstValueFrom(
        this.http.get<ApiResponse<{ trialInfo: TrialInfo }>>(
          `${this.getApiUrl(hubId)}/trial-info`,
          { withCredentials: true }
        )
      );

      if (!response.success || !response.data) {
        throw new Error(response.error?.message ?? 'Failed to get trial info');
      }

      return response.data.trialInfo;
    } catch (error) {
      console.error('Failed to get trial info:', error);
      throw error;
    }
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private async fetchSubscriptionSettings(): Promise<void> {
    const hubId = this.authState.selectedHub()?.id;
    if (!hubId) {
      this._error.set('No hub selected');
      return;
    }

    this._loading.set(true);
    this._error.set(null);

    try {
      const response = await firstValueFrom(
        this.http.get<ApiResponse<SubscriptionSettingsData>>(this.getApiUrl(hubId), {
          withCredentials: true,
        })
      );

      if (response.success && response.data) {
        this._subscription.set(response.data.subscription);
        this._availablePlans.set(response.data.availablePlans);
        this._cachedHubId.set(hubId);
        this._initialized.set(true);
      } else {
        this._error.set(response.error?.message ?? 'Failed to load subscription settings');
      }
    } catch (error) {
      console.error('Failed to fetch subscription settings:', error);
      this._error.set('Failed to load subscription settings');
    } finally {
      this._loading.set(false);
    }
  }

  // ============================================================================
  // Utility Methods
  // ============================================================================

  formatCurrency(amount: number, currency = 'MYR'): string {
    return `${currency} ${amount.toLocaleString('en-MY', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    })}`;
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('en-MY', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }
}

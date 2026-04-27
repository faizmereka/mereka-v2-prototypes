import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../../environments/environment';

// ============================================================================
// Types
// ============================================================================

export interface Plan {
  _id: string;
  planCode: string;
  name: string;
  tagline: string;
  description: string;
  price: number; // in cents
  currency: string;
  features: string[];
  status: string;
  sortOrder: number;
}

export interface CreateCheckoutSessionRequest {
  planCode: 'scale' | 'soar';
  successUrl: string;
  cancelUrl: string;
  hubId?: string;
  promoCode?: string;
}

export interface CheckoutSessionResponse {
  checkoutUrl: string;
  sessionId: string;
}

export interface Subscription {
  _id: string;
  userId: string;
  hubId?: string;
  planCode: string;
  status: string;
  billingCycle: string;
  price: number;
  currency: string;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  nextBillingDate: string;
  stripeSubscriptionId: string;
}

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: {
    code: string;
    message: string;
  };
}

// ============================================================================
// Subscription Service
// ============================================================================

@Injectable({
  providedIn: 'root',
})
export class SubscriptionService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/subscription`;

  /**
   * Get all available subscription plans
   */
  async getPlans(): Promise<Plan[]> {
    const response = await firstValueFrom(
      this.http.get<ApiResponse<{ plans: Plan[] }>>(`${this.apiUrl}/plans`)
    );

    if (!response.success || !response.data) {
      throw new Error(response.error?.message || 'Failed to get plans');
    }

    return response.data.plans;
  }

  /**
   * Create a checkout session for subscription
   */
  async createCheckoutSession(data: CreateCheckoutSessionRequest): Promise<CheckoutSessionResponse> {
    const response = await firstValueFrom(
      this.http.post<ApiResponse<CheckoutSessionResponse>>(
        `${this.apiUrl}/create-checkout-session`,
        data,
        { withCredentials: true }
      )
    );

    if (!response.success || !response.data) {
      throw new Error(response.error?.message || 'Failed to create checkout session');
    }

    return response.data;
  }

  /**
   * Verify checkout session after payment
   * @param forceCreate - Force create subscription from Stripe if not found in DB
   */
  async verifyCheckoutSession(
    sessionId: string,
    forceCreate = false
  ): Promise<Subscription | null> {
    const params: Record<string, string> = { sessionId };
    if (forceCreate) {
      params['forceCreate'] = 'true';
    }

    const response = await firstValueFrom(
      this.http.get<ApiResponse<{ subscription: Subscription }>>(
        `${this.apiUrl}/verify-session`,
        {
          params,
          withCredentials: true,
        }
      )
    );

    if (!response.success || !response.data) {
      return null;
    }

    return response.data.subscription;
  }

  /**
   * Get current user's subscriptions
   */
  async getMySubscriptions(): Promise<Array<{ subscription: Subscription; plan: Plan | null }>> {
    const response = await firstValueFrom(
      this.http.get<ApiResponse<{ subscriptions: Array<{ subscription: Subscription; plan: Plan | null }> }>>(
        `${this.apiUrl}/me`,
        { withCredentials: true }
      )
    );

    if (!response.success || !response.data) {
      throw new Error(response.error?.message || 'Failed to get subscriptions');
    }

    return response.data.subscriptions;
  }
}

import { Injectable, signal } from '@angular/core';
import { loadStripe, Stripe, StripeElements, StripeCardElement } from '@stripe/stripe-js';

/**
 * Stripe Service
 * Handles Stripe.js initialization and Elements for adding payment methods
 *
 * Multi-region support: Publishable key is provided by backend based on:
 * - Hub's region for checkout (experience/expertise)
 * - Expert's region for contract payments
 */
@Injectable({
  providedIn: 'root',
})
export class StripeService {
  private stripe: Stripe | null = null;
  private elements: StripeElements | null = null;
  private cardElement: StripeCardElement | null = null;
  private currentPublishableKey: string | null = null;

  readonly isLoading = signal(false);
  readonly error = signal<string | null>(null);

  /**
   * Initialize Stripe.js with regional publishable key from backend
   * @param publishableKey - Regional Stripe publishable key (required - provided by backend)
   */
  async initialize(publishableKey: string): Promise<Stripe | null> {
    if (!publishableKey) {
      console.error('Stripe publishable key is required');
      this.error.set('Payment system not configured');
      return null;
    }

    const keyToUse = publishableKey;

    // If already initialized with the same key, return existing instance
    if (this.stripe && this.currentPublishableKey === keyToUse) {
      return this.stripe;
    }

    // If initialized with a different key, we need to reinitialize
    if (this.stripe && this.currentPublishableKey !== keyToUse) {
      console.log('Reinitializing Stripe with new regional key');
      this.unmountCardElement();
      this.stripe = null;
    }

    try {
      this.isLoading.set(true);
      this.stripe = await loadStripe(keyToUse);
      this.currentPublishableKey = keyToUse;

      console.log('Stripe initialized with regional key');
      return this.stripe;
    } catch (err) {
      console.error('Failed to load Stripe:', err);
      this.error.set('Failed to load payment system');
      return null;
    } finally {
      this.isLoading.set(false);
    }
  }

  /**
   * Get current Stripe publishable key being used
   */
  getCurrentPublishableKey(): string | null {
    return this.currentPublishableKey;
  }

  /**
   * Create and mount card element
   * @param containerId - DOM element ID to mount the card element
   * @param publishableKey - Regional Stripe publishable key (required - provided by backend)
   */
  async mountCardElement(containerId: string, publishableKey: string): Promise<StripeCardElement | null> {
    const stripe = await this.initialize(publishableKey);
    if (!stripe) {
      return null;
    }

    this.elements = stripe.elements();
    this.cardElement = this.elements.create('card', {
      style: {
        base: {
          fontSize: '16px',
          color: '#374151',
          fontFamily: 'Inter, system-ui, sans-serif',
          '::placeholder': {
            color: '#9CA3AF',
          },
        },
        invalid: {
          color: '#EF4444',
          iconColor: '#EF4444',
        },
      },
    });

    const container = document.getElementById(containerId);
    if (container) {
      this.cardElement.mount(container);
    }

    return this.cardElement;
  }

  /**
   * Confirm setup intent and add payment method
   */
  async confirmSetupIntent(clientSecret: string): Promise<{ success: boolean; paymentMethodId?: string; error?: string }> {
    if (!this.stripe || !this.cardElement) {
      return { success: false, error: 'Stripe not initialized' };
    }

    try {
      const { setupIntent, error } = await this.stripe.confirmCardSetup(clientSecret, {
        payment_method: {
          card: this.cardElement,
        },
      });

      if (error) {
        return { success: false, error: error.message };
      }

      if (setupIntent?.status === 'succeeded' && setupIntent.payment_method) {
        return {
          success: true,
          paymentMethodId: typeof setupIntent.payment_method === 'string'
            ? setupIntent.payment_method
            : setupIntent.payment_method.id,
        };
      }

      return { success: false, error: 'Setup failed' };
    } catch (err) {
      console.error('Error confirming setup intent:', err);
      return { success: false, error: 'Failed to add card' };
    }
  }

  /**
   * Unmount and cleanup card element
   */
  unmountCardElement(): void {
    if (this.cardElement) {
      this.cardElement.unmount();
      this.cardElement = null;
    }
    this.elements = null;
  }

  /**
   * Get card element for validation
   */
  getCardElement(): StripeCardElement | null {
    return this.cardElement;
  }
}

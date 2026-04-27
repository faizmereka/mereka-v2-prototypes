import { Injectable, inject, PLATFORM_ID, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

// Stripe types (loaded dynamically)
declare const Stripe: any;

export interface CreatePaymentMethodResult {
  paymentMethod?: { id: string };
  error?: { message: string };
}

export interface ConfirmPaymentResult {
  paymentIntent?: { id: string; status: string };
  error?: { message: string };
}

@Injectable({ providedIn: 'root' })
export class StripeService {
  private readonly platformId = inject(PLATFORM_ID);
  private stripe: any = null;
  private elements: any = null;
  private paymentElement: any = null;
  private cardElement: any = null;
  private clientSecret: string | null = null;
  private currentPublishableKey: string | null = null;

  private readonly _isLoaded = signal(false);
  private readonly _isReady = signal(false);
  private readonly _error = signal<string | null>(null);

  readonly isLoaded = this._isLoaded.asReadonly();
  readonly isReady = this._isReady.asReadonly();
  readonly error = this._error.asReadonly();

  /**
   * Load Stripe.js script with regional publishable key from backend
   *
   * Multi-region support: Publishable key is provided by backend based on:
   * - Hub's region for checkout (experience/expertise)
   * - Expert's region for contract payments
   *
   * @param currency - Currency code (default: 'MYR')
   * @param publishableKey - Regional Stripe publishable key (required - provided by backend)
   */
  async loadStripe(currency: string = 'MYR', publishableKey?: string): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    if (!publishableKey) {
      console.error('Stripe publishable key is required');
      this._error.set('Payment system not configured');
      return;
    }

    const keyToUse = publishableKey;

    // If already loaded with the same key, skip re-initialization
    if (this._isLoaded() && this.currentPublishableKey === keyToUse) {
      return;
    }

    // If loaded with a different key, we need to reinitialize
    if (this._isLoaded() && this.currentPublishableKey !== keyToUse) {
      console.log('Reinitializing Stripe with new regional key');
      this.destroyElements();
      this._isLoaded.set(false);
    }

    try {
      await this.loadStripeScript();

      this.currentPublishableKey = keyToUse;
      this.stripe = (window as any).Stripe(keyToUse);
      this._isLoaded.set(true);
      console.log('Stripe initialized with regional key');
    } catch (err) {
      console.error('Failed to load Stripe:', err);
      this._error.set('Failed to load payment system');
    }
  }

  /**
   * Get current Stripe publishable key being used
   */
  getCurrentPublishableKey(): string | null {
    return this.currentPublishableKey;
  }

  /**
   * Create Payment Element (new Stripe UI)
   * Requires clientSecret from PaymentIntent
   */
  createPaymentElement(containerId: string, clientSecret: string): void {
    if (!this.stripe) {
      console.error('Stripe not loaded');
      return;
    }

    try {
      this.clientSecret = clientSecret;

      // Create elements with clientSecret
      this.elements = this.stripe.elements({
        clientSecret,
        appearance: {
          theme: 'stripe',
          variables: {
            colorPrimary: '#8B5CF6', // Purple primary
            colorBackground: '#ffffff',
            colorText: '#1f2937',
            colorDanger: '#ef4444',
            fontFamily: 'Inter, system-ui, sans-serif',
            fontSizeBase: '16px',
            borderRadius: '8px',
            spacingUnit: '4px',
          },
          rules: {
            '.Input': {
              border: '1px solid #d1d5db',
              boxShadow: 'none',
            },
            '.Input:focus': {
              border: '1px solid #8B5CF6',
              boxShadow: '0 0 0 1px #8B5CF6',
            },
            '.Label': {
              fontWeight: '500',
              color: '#374151',
            },
          },
        },
      });

      // Create Payment Element with Link disabled
      this.paymentElement = this.elements.create('payment', {
        layout: 'tabs',
        wallets: {
          applePay: 'never',
          googlePay: 'never',
        },
      });

      // Mount to container
      this.paymentElement.mount(`#${containerId}`);

      // Listen for ready event
      this.paymentElement.on('ready', () => {
        this._isReady.set(true);
      });

      // Listen for change events (validation)
      this.paymentElement.on('change', (event: any) => {
        if (event.error) {
          this._error.set(event.error.message);
        } else {
          this._error.set(null);
        }
      });
    } catch (err) {
      console.error('Failed to create payment element:', err);
      this._error.set('Failed to initialize payment form');
    }
  }

  /**
   * Create Payment Element with deferred intent (no clientSecret needed)
   * Uses card-only configuration for Stripe Atlas
   */
  createCardElement(containerId: string, amount: number = 0, currency: string = 'myr'): any {
    if (!this.stripe) {
      console.error('Stripe not loaded');
      return null;
    }

    try {
      // Use Payment Element with deferred intent - card only for Stripe Atlas
      this.elements = this.stripe.elements({
        mode: 'payment',
        amount: Math.max(amount * 100, 100), // Amount in cents, minimum 100 for display
        currency: currency.toLowerCase(),
        paymentMethodTypes: ['card'], // Card only for Stripe Atlas
        paymentMethodCreation: 'manual',
        appearance: {
          theme: 'flat', // Use flat theme for cleaner look
          variables: {
            colorPrimary: '#8B5CF6',
            colorBackground: '#ffffff',
            colorText: '#1f2937',
            colorDanger: '#ef4444',
            fontFamily: 'Inter, system-ui, sans-serif',
            spacingUnit: '4px',
            borderRadius: '8px',
          },
          rules: {
            '.Input': {
              border: '1px solid #d1d5db',
              boxShadow: 'none',
              backgroundColor: '#ffffff',
            },
            '.Input:focus': {
              border: '1px solid #8B5CF6',
              boxShadow: '0 0 0 1px #8B5CF6',
            },
            '.Label': {
              fontWeight: '500',
              color: '#374151',
            },
            '.Tab': {
              border: 'none',
              boxShadow: 'none',
            },
            '.Tab--selected': {
              border: 'none',
              boxShadow: 'none',
            },
            '.Block': {
              border: 'none',
              boxShadow: 'none',
            },
            '.AccordionItem': {
              border: 'none',
              boxShadow: 'none',
            },
            '.AccordionItemHeader': {
              padding: '0',
            },
          },
        },
      });

      if (!this.elements) {
        this._error.set('Failed to create payment elements');
        return null;
      }

      // Create Payment Element - use auto layout for cleaner single-method display
      this.paymentElement = this.elements.create('payment', {
        layout: {
          type: 'accordion',
          defaultCollapsed: false,
          radios: false,
          spacedAccordionItems: false,
        },
        wallets: {
          applePay: 'never',
          googlePay: 'never',
        },
      });

      if (!this.paymentElement) {
        this._error.set('Failed to create payment element');
        return null;
      }

      // Mount to container
      this.paymentElement.mount(`#${containerId}`);

      // Listen for ready event
      this.paymentElement.on('ready', () => {
        this._isReady.set(true);
      });

      // Listen for errors
      this.paymentElement.on('change', (event: any) => {
        if (event.error) {
          this._error.set(event.error.message);
        } else {
          this._error.set(null);
        }
      });

      return this.paymentElement;
    } catch (err) {
      console.error('Failed to create payment element:', err);
      this._error.set('Failed to initialize payment form');
      return null;
    }
  }

  /**
   * Confirm payment using Payment Element
   * Use this when you have a clientSecret
   */
  async confirmPayment(returnUrl: string): Promise<ConfirmPaymentResult> {
    if (!this.stripe || !this.elements) {
      return { error: { message: 'Payment form not ready' } };
    }

    try {
      const result = await this.stripe.confirmPayment({
        elements: this.elements,
        confirmParams: {
          return_url: returnUrl,
        },
        redirect: 'if_required',
      });

      if (result.error) {
        return { error: { message: result.error.message } };
      }

      return { paymentIntent: result.paymentIntent };
    } catch (err: any) {
      return { error: { message: err.message || 'Payment failed' } };
    }
  }

  /**
   * Create payment method from Payment Element
   * Works with both Card Element and Payment Element
   */
  async createPaymentMethod(billingDetails?: {
    name?: string;
    email?: string;
  }): Promise<CreatePaymentMethodResult> {
    if (!this.stripe || !this.elements) {
      return { error: { message: 'Payment form not ready' } };
    }

    try {
      // First submit the elements to validate
      const { error: submitError } = await this.elements.submit();
      if (submitError) {
        return { error: { message: submitError.message } };
      }

      // Create payment method from elements (works with Payment Element)
      const result = await this.stripe.createPaymentMethod({
        elements: this.elements,
        params: {
          billing_details: billingDetails,
        },
      });

      return result;
    } catch (err: any) {
      return { error: { message: err.message || 'Payment failed' } };
    }
  }

  /**
   * Check if using Payment Element (has clientSecret)
   */
  hasPaymentElement(): boolean {
    return !!this.clientSecret && !!this.paymentElement;
  }

  /**
   * Destroy elements (cleanup)
   */
  destroyElements(): void {
    if (this.paymentElement) {
      this.paymentElement.unmount();
      this.paymentElement.destroy();
      this.paymentElement = null;
    }
    if (this.cardElement) {
      this.cardElement.unmount();
      this.cardElement.destroy();
      this.cardElement = null;
    }
    this.elements = null;
    this.clientSecret = null;
    this._isReady.set(false);
    this._error.set(null);
  }

  /**
   * Alias for backward compatibility
   */
  destroyCardElement(): void {
    this.destroyElements();
  }

  /**
   * Load Stripe.js script dynamically
   */
  private loadStripeScript(): Promise<void> {
    return new Promise((resolve, reject) => {
      // Check if already loaded
      if ((window as any).Stripe) {
        resolve();
        return;
      }

      // Check if script tag already exists
      const existingScript = document.querySelector('script[src*="js.stripe.com"]');
      if (existingScript) {
        existingScript.addEventListener('load', () => resolve());
        existingScript.addEventListener('error', () => reject(new Error('Failed to load Stripe')));
        return;
      }

      // Create and load script
      const script = document.createElement('script');
      script.src = 'https://js.stripe.com/v3/';
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Failed to load Stripe'));
      document.head.appendChild(script);
    });
  }
}

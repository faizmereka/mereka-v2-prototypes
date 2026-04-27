import {
  Component,
  input,
  output,
  inject,
  OnInit,
  OnDestroy,
  PLATFORM_ID,
  effect,
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { StripeService } from '../../../core/services/stripe.service';

@Component({
  selector: 'app-stripe-payment',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="space-y-4">
      <!-- Payment Element Container -->
      <div>
        <div
          id="payment-element"
          class="min-h-[100px]"
        ></div>

        @if (stripeService.error()) {
          <p class="mt-2 text-sm text-red-500">{{ stripeService.error() }}</p>
        }
      </div>

      <!-- Loading State -->
      @if (!stripeService.isReady()) {
        <div class="flex items-center justify-center py-4 text-neutral-500">
          <svg class="animate-spin h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          Loading payment form...
        </div>
      }

      <!-- Secure Payment Badge -->
      <div class="flex items-center justify-center gap-2 text-sm text-neutral-500">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
            d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
        <span>Secure payment powered by Stripe</span>
      </div>
    </div>
  `,
})
export class StripePaymentComponent implements OnInit, OnDestroy {
  private readonly platformId = inject(PLATFORM_ID);
  readonly stripeService = inject(StripeService);

  readonly currency = input<string>('MYR');
  readonly amount = input<number>(0); // Amount for deferred intent
  readonly clientSecret = input<string | undefined>(undefined);
  readonly stripePublishableKey = input<string | undefined>(undefined); // Regional key from backend
  readonly ready = output<boolean>();

  private initialized = false;

  constructor() {
    // React to clientSecret changes
    effect(() => {
      const secret = this.clientSecret();
      if (secret && this.stripeService.isLoaded() && !this.initialized) {
        this.initializePaymentElement(secret);
      }
    });
  }

  async ngOnInit(): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    // Load Stripe with regional publishable key if provided
    await this.stripeService.loadStripe(this.currency(), this.stripePublishableKey());

    // Initialize with clientSecret if available
    const secret = this.clientSecret();
    if (secret) {
      this.initializePaymentElement(secret);
    } else {
      // Use Payment Element with deferred intent (like v1)
      this.stripeService.createCardElement('payment-element', this.amount(), this.currency());
    }

    // Emit ready when element is ready
    if (this.stripeService.isReady()) {
      this.ready.emit(true);
    }
  }

  private initializePaymentElement(clientSecret: string): void {
    if (this.initialized) return;
    this.initialized = true;
    this.stripeService.createPaymentElement('payment-element', clientSecret);
  }

  ngOnDestroy(): void {
    this.stripeService.destroyElements();
    this.initialized = false;
  }
}

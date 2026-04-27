import {
  Component,
  input,
  output,
  signal,
  inject,
  OnDestroy,
  effect,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { StripeService } from '../../../../../../../core/services/stripe.service';

@Component({
  selector: 'app-add-payment-method-dialog',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (isOpen()) {
      <div
        class="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
        (click)="onCancel()"
      >
        <div
          class="bg-white rounded-xl max-w-md w-full"
          (click)="$event.stopPropagation()"
        >
          <!-- Header -->
          <div class="p-6 border-b border-neutral-200">
            <h2 class="text-xl font-semibold text-neutral-900">
              Add Payment Method
            </h2>
            <p class="text-sm text-neutral-500 mt-1">
              Add a card to pay for milestones
            </p>
          </div>

          <!-- Content -->
          <div class="p-6">
            @if (isInitializing()) {
              <div class="flex items-center justify-center py-8">
                <div
                  class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"
                ></div>
              </div>
            } @else if (initError()) {
              <div class="p-4 bg-red-50 border border-red-200 rounded-lg">
                <p class="text-sm text-red-700">{{ initError() }}</p>
                <button
                  (click)="retryInit()"
                  class="mt-2 text-sm font-medium text-primary hover:text-primary/80"
                >
                  Try Again
                </button>
              </div>
            } @else {
              <!-- Card Element Container -->
              <div class="mb-4">
                <label class="block text-sm font-medium text-neutral-700 mb-2">
                  Card Details
                </label>
                <div
                  id="card-element-contract"
                  class="p-3 border border-neutral-300 rounded-lg bg-white focus-within:ring-2 focus-within:ring-primary focus-within:border-primary"
                ></div>
              </div>

              @if (cardError()) {
                <p class="text-sm text-red-600 mb-4">{{ cardError() }}</p>
              }

              <!-- Region Info -->
              <p class="text-xs text-neutral-400 mt-4">
                Payment region:
                {{ stripeRegion() === 'malaysia' ? 'Malaysia' : 'Global' }}
              </p>
            }
          </div>

          <!-- Actions -->
          <div class="p-6 border-t border-neutral-200 flex justify-end gap-3">
            <button
              (click)="onCancel()"
              [disabled]="isSaving()"
              class="px-4 py-2 border border-neutral-300 text-neutral-700 rounded-lg hover:bg-neutral-50 disabled:opacity-50 transition-colors"
            >
              Cancel
            </button>
            <button
              (click)="saveCard()"
              [disabled]="isSaving() || isInitializing() || !!initError()"
              class="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors flex items-center gap-2"
            >
              @if (isSaving()) {
                <div
                  class="animate-spin rounded-full h-4 w-4 border-b-2 border-white"
                ></div>
                Saving...
              } @else {
                Add Card
              }
            </button>
          </div>
        </div>
      </div>
    }
  `,
})
export class AddPaymentMethodDialogComponent implements OnDestroy {
  private readonly stripeService = inject(StripeService);

  isOpen = input<boolean>(false);
  clientSecret = input<string | null>(null);
  stripePublishableKey = input<string | null>(null);
  stripeRegion = input<'malaysia' | 'atlas'>('atlas');

  close = output<void>();
  paymentMethodAdded = output<void>();

  readonly isInitializing = signal(false);
  readonly initError = signal<string | null>(null);
  readonly cardError = signal<string | null>(null);
  readonly isSaving = signal(false);

  private initialized = false;

  constructor() {
    // Watch for dialog open and initialize Stripe
    effect(() => {
      if (this.isOpen() && this.clientSecret() && this.stripePublishableKey()) {
        this.initializeStripe();
      }
    });
  }

  ngOnDestroy(): void {
    this.cleanup();
  }

  private async initializeStripe(): Promise<void> {
    if (this.initialized) return;

    this.isInitializing.set(true);
    this.initError.set(null);

    try {
      const cardElement = await this.stripeService.mountCardElement(
        'card-element-contract',
        this.stripePublishableKey()!
      );

      if (!cardElement) {
        throw new Error('Failed to initialize payment form');
      }

      // Listen for card errors
      cardElement.on('change', (event) => {
        if (event.error) {
          this.cardError.set(event.error.message);
        } else {
          this.cardError.set(null);
        }
      });

      this.initialized = true;
    } catch (err) {
      console.error('Error initializing Stripe:', err);
      this.initError.set(
        err instanceof Error ? err.message : 'Failed to load payment form'
      );
    } finally {
      this.isInitializing.set(false);
    }
  }

  retryInit(): void {
    this.initialized = false;
    this.initializeStripe();
  }

  async saveCard(): Promise<void> {
    const secret = this.clientSecret();
    if (!secret) {
      this.cardError.set('Missing setup information');
      return;
    }

    this.isSaving.set(true);
    this.cardError.set(null);

    try {
      const result = await this.stripeService.confirmSetupIntent(secret);

      if (result.success) {
        this.paymentMethodAdded.emit();
        this.onCancel();
      } else {
        this.cardError.set(result.error || 'Failed to add card');
      }
    } catch (err) {
      console.error('Error saving card:', err);
      this.cardError.set(
        err instanceof Error ? err.message : 'Failed to add card'
      );
    } finally {
      this.isSaving.set(false);
    }
  }

  onCancel(): void {
    this.cleanup();
    this.close.emit();
  }

  private cleanup(): void {
    this.stripeService.unmountCardElement();
    this.initialized = false;
    this.cardError.set(null);
    this.initError.set(null);
  }
}

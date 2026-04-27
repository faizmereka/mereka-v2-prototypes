import { Component, inject, signal, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IconComponent, DialogRef, DIALOG_DATA, ToastService } from '@mereka/ui';
import { HubSubscriptionService, PaymentMethodInfo } from '../../../../../../services/hub-subscription.service';
import { StripeService } from '../../../../../../../../core/services/stripe.service';

export interface PaymentMethodDialogData {
  currency: string;
  amount: number;
  firstMilestoneAmount?: number;
}

export interface PaymentMethodDialogResult {
  paymentMethodId: string;
  stripeCustomerId?: string;
}

@Component({
  selector: 'app-payment-method-dialog',
  standalone: true,
  imports: [CommonModule, IconComponent],
  template: `
    <div class="p-6 max-w-lg">
      <!-- Header -->
      <div class="flex items-center justify-between mb-6">
        <h2 class="text-xl font-semibold text-neutral-900">Select Payment Method</h2>
        <button
          type="button"
          (click)="close()"
          class="text-neutral-400 hover:text-neutral-600 transition-colors"
        >
          <ui-icon name="close" class="w-5 h-5"></ui-icon>
        </button>
      </div>

      <!-- Amount Info -->
      <div class="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <div class="flex items-center gap-2 text-blue-700">
          <ui-icon name="info" class="w-5 h-5"></ui-icon>
          <span class="font-medium">First milestone will be funded</span>
        </div>
        <p class="text-blue-600 text-sm mt-1">
          {{ data.currency }} {{ data.firstMilestoneAmount || data.amount | number:'1.2-2' }} will be charged to fund the first milestone.
        </p>
      </div>

      @if (isLoading()) {
        <div class="flex items-center justify-center py-8">
          <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        </div>
      } @else {
        <!-- Payment Methods List -->
        @if (!showAddCard()) {
          <div class="space-y-3 mb-6">
            @for (method of paymentMethods(); track method.id) {
              <button
                type="button"
                (click)="selectPaymentMethod(method)"
                class="w-full flex items-center gap-4 p-4 border rounded-lg transition-all"
                [class.border-primary-500]="selectedMethodId() === method.id"
                [class.bg-primary-50]="selectedMethodId() === method.id"
                [class.border-neutral-200]="selectedMethodId() !== method.id"
                [class.hover:border-neutral-300]="selectedMethodId() !== method.id"
              >
                <!-- Card Icon -->
                <div class="w-10 h-10 bg-neutral-100 rounded-lg flex items-center justify-center">
                  <ui-icon name="credit-card" class="w-5 h-5 text-neutral-600"></ui-icon>
                </div>

                <!-- Card Details -->
                <div class="flex-1 text-left">
                  <div class="font-medium text-neutral-900">
                    {{ method.brand | titlecase }} **** {{ method.last4 }}
                  </div>
                  @if (method.expMonth && method.expYear) {
                    <div class="text-sm text-neutral-500">
                      Expires {{ method.expMonth }}/{{ method.expYear }}
                    </div>
                  }
                </div>

                <!-- Default Badge / Selected Check -->
                @if (method.isDefault) {
                  <span class="px-2 py-1 bg-neutral-100 text-neutral-600 text-xs font-medium rounded">
                    Default
                  </span>
                }
                @if (selectedMethodId() === method.id) {
                  <ui-icon name="check-circle" class="w-5 h-5 text-primary-600"></ui-icon>
                }
              </button>
            } @empty {
              <div class="text-center py-8 text-neutral-500">
                <ui-icon name="credit-card" class="w-12 h-12 mx-auto mb-3 text-neutral-300"></ui-icon>
                <p>No payment methods found</p>
                <p class="text-sm">Add a card to continue</p>
              </div>
            }
          </div>

          <!-- Add New Card Button -->
          <button
            type="button"
            (click)="toggleAddCard()"
            class="w-full flex items-center justify-center gap-2 p-3 border-2 border-dashed border-neutral-300 rounded-lg text-neutral-600 hover:border-primary-400 hover:text-primary-600 transition-colors"
          >
            <ui-icon name="plus" class="w-5 h-5"></ui-icon>
            <span>Add New Card</span>
          </button>
        } @else {
          <!-- Add Card Form -->
          <div class="mb-6">
            <label class="block text-sm font-medium text-neutral-700 mb-2">
              Card Details
            </label>
            <div
              id="card-element"
              class="p-4 border border-neutral-300 rounded-lg bg-white min-h-[44px]"
            ></div>
            @if (cardError()) {
              <p class="mt-2 text-sm text-red-600">{{ cardError() }}</p>
            }
          </div>

          <div class="flex gap-3">
            <button
              type="button"
              (click)="toggleAddCard()"
              class="flex-1 px-4 py-2 border border-neutral-300 rounded-lg text-neutral-700 hover:bg-neutral-50 transition-colors"
            >
              Back
            </button>
            <button
              type="button"
              (click)="addCard()"
              [disabled]="isAddingCard()"
              class="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              @if (isAddingCard()) {
                <div class="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>Adding...</span>
              } @else {
                <span>Add Card</span>
              }
            </button>
          </div>
        }
      }

      <!-- Footer Actions -->
      @if (!showAddCard() && paymentMethods().length > 0) {
        <div class="flex gap-3 mt-6 pt-6 border-t">
          <button
            type="button"
            (click)="close()"
            class="flex-1 px-4 py-2 border border-neutral-300 rounded-lg text-neutral-700 hover:bg-neutral-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            (click)="confirmSelection()"
            [disabled]="!selectedMethodId()"
            class="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Confirm & Send Offer
          </button>
        </div>
      }
    </div>
  `,
})
export class PaymentMethodDialogComponent implements OnInit, OnDestroy {
  private readonly dialogRef = inject(DialogRef<PaymentMethodDialogResult | null>);
  readonly data = inject<PaymentMethodDialogData>(DIALOG_DATA);
  private readonly subscriptionService = inject(HubSubscriptionService);
  private readonly stripeService = inject(StripeService);
  private readonly toastService = inject(ToastService);

  readonly isLoading = signal(true);
  readonly paymentMethods = signal<PaymentMethodInfo[]>([]);
  readonly selectedMethodId = signal<string | null>(null);
  readonly showAddCard = signal(false);
  readonly isAddingCard = signal(false);
  readonly cardError = signal<string | null>(null);

  private setupIntentClientSecret: string | null = null;
  private stripeCustomerId: string | null = null;

  async ngOnInit(): Promise<void> {
    await this.loadPaymentMethods();

    // If no payment methods after loading, show add card form
    if (this.paymentMethods().length === 0) {
      // Small delay to ensure DOM is ready
      setTimeout(() => {
        this.toggleAddCard();
      }, 50);
    }
  }

  ngOnDestroy(): void {
    this.stripeService.unmountCardElement();
  }

  private async loadPaymentMethods(): Promise<void> {
    this.isLoading.set(true);
    try {
      const result = await this.subscriptionService.getPaymentMethods();
      this.paymentMethods.set(result.paymentMethods);
      this.stripeCustomerId = result.stripeCustomerId;

      // Auto-select default payment method
      const defaultMethod = result.paymentMethods.find(m => m.isDefault);
      if (defaultMethod) {
        this.selectedMethodId.set(defaultMethod.id);
      } else if (result.paymentMethods.length > 0) {
        this.selectedMethodId.set(result.paymentMethods[0].id);
      }
    } catch (error) {
      console.error('Failed to load payment methods:', error);
    } finally {
      this.isLoading.set(false);
    }
  }

  selectPaymentMethod(method: PaymentMethodInfo): void {
    this.selectedMethodId.set(method.id);
  }

  async toggleAddCard(): Promise<void> {
    this.showAddCard.update(v => !v);
    this.cardError.set(null);

    if (this.showAddCard()) {
      // Create setup intent and mount card element
      try {
        const { clientSecret, publishableKey } = await this.subscriptionService.createSetupIntent();
        this.setupIntentClientSecret = clientSecret;

        // Wait for DOM to update, then mount
        setTimeout(async () => {
          await this.stripeService.mountCardElement('card-element', publishableKey);
        }, 50);
      } catch (error) {
        console.error('Failed to create setup intent:', error);
        this.cardError.set('Failed to initialize card form');
        this.showAddCard.set(false);
      }
    } else {
      this.stripeService.unmountCardElement();
      this.setupIntentClientSecret = null;
    }
  }

  async addCard(): Promise<void> {
    if (!this.setupIntentClientSecret) {
      this.cardError.set('Please try again');
      return;
    }

    this.isAddingCard.set(true);
    this.cardError.set(null);

    try {
      const result = await this.stripeService.confirmSetupIntent(this.setupIntentClientSecret);

      if (result.success && result.paymentMethodId) {
        this.toastService.success('Card added successfully');

        // Reload payment methods and select the new one
        await this.loadPaymentMethods();
        this.selectedMethodId.set(result.paymentMethodId);
        this.showAddCard.set(false);
        this.stripeService.unmountCardElement();
      } else {
        this.cardError.set(result.error || 'Failed to add card');
      }
    } catch (error) {
      console.error('Error adding card:', error);
      this.cardError.set('Failed to add card');
    } finally {
      this.isAddingCard.set(false);
    }
  }

  confirmSelection(): void {
    const methodId = this.selectedMethodId();
    if (!methodId) {
      return;
    }

    this.dialogRef.close({
      paymentMethodId: methodId,
      stripeCustomerId: this.stripeCustomerId ?? undefined,
    });
  }

  close(): void {
    this.dialogRef.close(null);
  }
}

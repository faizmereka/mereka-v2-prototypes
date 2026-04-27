import { Component, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

export interface AppliedCoupon {
  code: string;
  discount: number;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  couponType: 'mereka' | 'hub';
}

@Component({
  selector: 'app-coupon-input',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="space-y-3">
      @if (!appliedCoupon()) {
        <!-- Coupon Input Form -->
        <div class="flex gap-2">
          <input
            type="text"
            [(ngModel)]="couponCode"
            [disabled]="loading()"
            placeholder="Enter promo code"
            class="flex-1 px-3 py-2 border border-neutral-300 rounded-lg text-sm
                   focus:ring-2 focus:ring-primary-500 focus:border-primary-500
                   disabled:bg-neutral-100 disabled:cursor-not-allowed uppercase"
            (keyup.enter)="applyCode()"
          />
          <button
            type="button"
            [disabled]="!couponCode.trim() || loading()"
            (click)="applyCode()"
            class="px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded-lg
                   hover:bg-primary-700 disabled:bg-neutral-300 disabled:cursor-not-allowed
                   transition-colors"
          >
            @if (loading()) {
              <svg class="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            } @else {
              Apply
            }
          </button>
        </div>

        @if (error()) {
          <p class="text-sm text-red-500">{{ error() }}</p>
        }
      } @else {
        <!-- Applied Coupon Display -->
        <div class="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
          <div class="flex items-center gap-2">
            <svg class="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <p class="text-sm font-medium text-green-800">
                {{ appliedCoupon()!.code }}
              </p>
              <p class="text-xs text-green-600">
                @if (appliedCoupon()!.discountType === 'percentage') {
                  {{ appliedCoupon()!.discountValue }}% off
                } @else {
                  {{ currency() }} {{ appliedCoupon()!.discountValue }} off
                }
              </p>
            </div>
          </div>
          <button
            type="button"
            (click)="removeCoupon()"
            class="p-1 text-green-600 hover:text-green-800 transition-colors"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      }
    </div>
  `,
})
export class CouponInputComponent {
  readonly currency = input<string>('MYR');
  readonly appliedCoupon = input<AppliedCoupon | null>(null);
  readonly loading = input<boolean>(false);

  readonly apply = output<string>();
  readonly remove = output<void>();

  couponCode = '';
  readonly error = signal<string>('');

  applyCode(): void {
    const code = this.couponCode.trim().toUpperCase();
    if (!code) return;

    this.error.set('');
    this.apply.emit(code);
  }

  removeCoupon(): void {
    this.couponCode = '';
    this.error.set('');
    this.remove.emit();
  }

  setError(message: string): void {
    this.error.set(message);
  }

  clearError(): void {
    this.error.set('');
  }
}

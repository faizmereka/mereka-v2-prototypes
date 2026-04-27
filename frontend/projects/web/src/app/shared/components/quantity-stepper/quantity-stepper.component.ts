import {
  Component,
  input,
  output,
  computed,
  signal,
  effect,
} from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * QuantityStepperComponent
 *
 * A reusable +/- stepper component for selecting quantities.
 * Used for ticket selection in the booking widget.
 */
@Component({
  selector: 'app-quantity-stepper',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="flex items-center gap-3">
      <!-- Decrease Button -->
      <button
        type="button"
        (click)="decrease()"
        [disabled]="isMinDisabled()"
        class="w-8 h-8 flex items-center justify-center rounded-full border transition-colors"
        [class.border-neutral-300]="!isMinDisabled()"
        [class.text-neutral-700]="!isMinDisabled()"
        [class.hover:bg-neutral-100]="!isMinDisabled()"
        [class.border-neutral-200]="isMinDisabled()"
        [class.text-neutral-300]="isMinDisabled()"
        [class.cursor-not-allowed]="isMinDisabled()"
        aria-label="Decrease quantity">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 12H4" />
        </svg>
      </button>

      <!-- Quantity Display -->
      <span
        class="w-8 text-center font-medium text-neutral-900"
        [class.text-neutral-400]="disabled()">
        {{ value() }}
      </span>

      <!-- Increase Button -->
      <button
        type="button"
        (click)="increase()"
        [disabled]="isMaxDisabled()"
        class="w-8 h-8 flex items-center justify-center rounded-full border transition-colors"
        [class.border-neutral-300]="!isMaxDisabled()"
        [class.text-neutral-700]="!isMaxDisabled()"
        [class.hover:bg-neutral-100]="!isMaxDisabled()"
        [class.border-neutral-200]="isMaxDisabled()"
        [class.text-neutral-300]="isMaxDisabled()"
        [class.cursor-not-allowed]="isMaxDisabled()"
        aria-label="Increase quantity">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
        </svg>
      </button>
    </div>
  `,
})
export class QuantityStepperComponent {
  /** Current value */
  readonly value = input<number>(0);

  /** Minimum value (default: 0) */
  readonly min = input<number>(0);

  /** Maximum value (default: 99) */
  readonly max = input<number>(99);

  /** Disabled state */
  readonly disabled = input<boolean>(false);

  /** Step increment (default: 1) */
  readonly step = input<number>(1);

  /** Emitted when value changes */
  readonly valueChange = output<number>();

  /** Internal value for controlled updates */
  private readonly _internalValue = signal<number>(0);

  constructor() {
    // Sync internal value with input value
    effect(() => {
      this._internalValue.set(this.value());
    });
  }

  /** Whether decrease button should be disabled */
  readonly isMinDisabled = computed(
    () => this.disabled() || this._internalValue() <= this.min()
  );

  /** Whether increase button should be disabled */
  readonly isMaxDisabled = computed(
    () => this.disabled() || this._internalValue() >= this.max()
  );

  /** Decrease the value */
  decrease(): void {
    if (this.isMinDisabled()) return;
    const newValue = Math.max(this.min(), this._internalValue() - this.step());
    this._internalValue.set(newValue);
    this.valueChange.emit(newValue);
  }

  /** Increase the value */
  increase(): void {
    if (this.isMaxDisabled()) return;
    const newValue = Math.min(this.max(), this._internalValue() + this.step());
    this._internalValue.set(newValue);
    this.valueChange.emit(newValue);
  }
}

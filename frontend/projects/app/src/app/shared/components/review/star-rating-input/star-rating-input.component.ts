import { Component, Input, Output, EventEmitter, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * Star Rating Input Component
 * Interactive star rating selector (1-5 stars)
 */
@Component({
  selector: 'app-star-rating-input',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div
      class="flex items-center gap-1"
      [class]="containerClass()"
      role="radiogroup"
      [attr.aria-label]="ariaLabel"
    >
      @for (star of stars; track star) {
        <button
          type="button"
          class="focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-1 rounded transition-transform duration-150"
          [class.cursor-not-allowed]="isDisabled()"
          [class.opacity-50]="isDisabled()"
          [disabled]="isDisabled()"
          [attr.aria-label]="star + ' star' + (star > 1 ? 's' : '')"
          [attr.aria-checked]="currentValue() === star"
          role="radio"
          (click)="selectRating(star)"
          (mouseenter)="onHover(star)"
          (mouseleave)="onHoverEnd()"
          (keydown.arrowRight)="incrementRating()"
          (keydown.arrowLeft)="decrementRating()"
        >
          <svg
            [class]="starClass()"
            [class.transform]="!isDisabled()"
            [class.hover:scale-110]="!isDisabled()"
            [class.active:scale-95]="!isDisabled()"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"
              [attr.fill]="getStarFill(star)"
              stroke="none"
            />
          </svg>
        </button>
      }
      @if (showLabel) {
        <span class="ml-2 text-sm text-neutral-600">
          {{ ratingLabel() }}
        </span>
      }
    </div>
  `,
})
export class StarRatingInputComponent {
  @Input() set value(val: number) {
    this._value.set(val);
  }
  @Input() set disabled(val: boolean) {
    this._disabled.set(val);
  }
  @Input() size: 'sm' | 'md' | 'lg' = 'md';
  @Input() showLabel = true;
  @Input() ariaLabel = 'Rating';
  @Input() fillColor = '#FFC043';
  @Input() hoverColor = '#FFD700';
  @Input() emptyColor = '#E5E7EB';

  @Output() valueChange = new EventEmitter<number>();

  readonly stars = [1, 2, 3, 4, 5];

  private readonly _value = signal(0);
  private readonly _disabled = signal(false);
  private readonly _hoverValue = signal(0);

  readonly currentValue = this._value.asReadonly();
  readonly isDisabled = this._disabled.asReadonly();

  readonly ratingLabel = computed(() => {
    const value = this._value();
    if (value === 0) return 'Select a rating';
    const labels = ['', 'Poor', 'Fair', 'Good', 'Very Good', 'Excellent'];
    return labels[value] || '';
  });

  readonly containerClass = computed(() => {
    const sizeClasses = {
      sm: 'text-xs',
      md: 'text-sm',
      lg: 'text-base',
    };
    return sizeClasses[this.size];
  });

  readonly starClass = computed(() => {
    const sizeClasses = {
      sm: 'w-6 h-6',
      md: 'w-8 h-8',
      lg: 'w-10 h-10',
    };
    return sizeClasses[this.size];
  });

  getStarFill(star: number): string {
    const hoverValue = this._hoverValue();
    const value = this._value();
    const displayValue = hoverValue > 0 ? hoverValue : value;

    if (star <= displayValue) {
      return hoverValue > 0 ? this.hoverColor : this.fillColor;
    }
    return this.emptyColor;
  }

  selectRating(star: number): void {
    if (this._disabled()) return;
    this._value.set(star);
    this.valueChange.emit(star);
  }

  onHover(star: number): void {
    if (this._disabled()) return;
    this._hoverValue.set(star);
  }

  onHoverEnd(): void {
    this._hoverValue.set(0);
  }

  incrementRating(): void {
    if (this._disabled()) return;
    const current = this._value();
    if (current < 5) {
      this._value.set(current + 1);
      this.valueChange.emit(current + 1);
    }
  }

  decrementRating(): void {
    if (this._disabled()) return;
    const current = this._value();
    if (current > 1) {
      this._value.set(current - 1);
      this.valueChange.emit(current - 1);
    }
  }
}

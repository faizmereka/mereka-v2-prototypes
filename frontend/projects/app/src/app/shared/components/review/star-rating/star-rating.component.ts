import { Component, Input, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * Star Rating Display Component
 * Read-only display of star ratings with support for partial stars
 */
@Component({
  selector: 'app-star-rating',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="flex items-center gap-1" [class]="containerClass()">
      @for (star of stars(); track star.index) {
        <svg
          [class]="starClass()"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <!-- Background (empty) star -->
          <path
            d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"
            [attr.fill]="emptyColor"
            stroke="none"
          />
          <!-- Filled portion -->
          @if (star.fill > 0) {
            <defs>
              <clipPath [attr.id]="'star-clip-' + star.index + '-' + uniqueId">
                <rect x="0" y="0" [attr.width]="star.fill * 24" height="24" />
              </clipPath>
            </defs>
            <path
              d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"
              [attr.fill]="fillColor"
              stroke="none"
              [attr.clip-path]="'url(#star-clip-' + star.index + '-' + uniqueId + ')'"
            />
          }
        </svg>
      }
      @if (showValue) {
        <span [class]="valueClass()">{{ formattedRating() }}</span>
      }
      @if (reviewCount$() !== undefined && reviewCount$()! > 0) {
        <span class="text-neutral-500">({{ reviewCount$() }})</span>
      }
    </div>
  `,
})
export class StarRatingComponent {
  @Input() set rating(value: number) {
    this._rating.set(value);
  }
  @Input() size: 'sm' | 'md' | 'lg' = 'md';
  @Input() showValue = false;
  @Input() set reviewCount(value: number | undefined) {
    this._reviewCount.set(value);
  }
  @Input() fillColor = '#FFC043';
  @Input() emptyColor = '#E5E7EB';

  private readonly _rating = signal(0);
  private readonly _reviewCount = signal<number | undefined>(undefined);

  readonly uniqueId = Math.random().toString(36).substring(7);

  readonly reviewCount$ = this._reviewCount.asReadonly();

  readonly stars = computed(() => {
    const rating = this._rating();
    return Array.from({ length: 5 }, (_, i) => {
      const fill = Math.min(1, Math.max(0, rating - i));
      return { index: i, fill };
    });
  });

  readonly formattedRating = computed(() => {
    const rating = this._rating();
    return rating.toFixed(1);
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
      sm: 'w-4 h-4',
      md: 'w-5 h-5',
      lg: 'w-6 h-6',
    };
    return sizeClasses[this.size];
  });

  readonly valueClass = computed(() => {
    const sizeClasses = {
      sm: 'text-xs font-medium text-neutral-700',
      md: 'text-sm font-medium text-neutral-700',
      lg: 'text-base font-semibold text-neutral-800',
    };
    return sizeClasses[this.size];
  });
}

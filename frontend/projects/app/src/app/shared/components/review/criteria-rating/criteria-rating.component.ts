import { Component, Input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StarRatingComponent } from '../star-rating/star-rating.component';

export interface CriteriaRatings {
  quality: number;
  communication: number;
  professionalism: number;
  timeliness: number;
}

/**
 * Criteria Rating Component
 * Displays contract review criteria ratings (quality, communication, professionalism, timeliness)
 */
@Component({
  selector: 'app-criteria-rating',
  standalone: true,
  imports: [CommonModule, StarRatingComponent],
  template: `
    <div class="grid grid-cols-2 gap-x-6 gap-y-2">
      @for (criterion of criteria; track criterion.key) {
        <div class="flex items-center justify-between">
          <span class="text-sm text-neutral-600">{{ criterion.label }}</span>
          <app-star-rating
            [rating]="getValue(criterion.key)"
            size="sm"
            [showValue]="showValues"
          />
        </div>
      }
    </div>
  `,
})
export class CriteriaRatingComponent {
  @Input() set criteriaRatings(value: CriteriaRatings) {
    this._criteriaRatings.set(value);
  }
  @Input() showValues = false;

  private readonly _criteriaRatings = signal<CriteriaRatings>({
    quality: 0,
    communication: 0,
    professionalism: 0,
    timeliness: 0,
  });

  readonly criteria = [
    { key: 'quality' as const, label: 'Quality' },
    { key: 'communication' as const, label: 'Communication' },
    { key: 'professionalism' as const, label: 'Professionalism' },
    { key: 'timeliness' as const, label: 'Timeliness' },
  ];

  getValue(key: keyof CriteriaRatings): number {
    return this._criteriaRatings()[key];
  }
}

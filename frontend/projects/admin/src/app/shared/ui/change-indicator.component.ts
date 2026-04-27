import { Component, input } from '@angular/core';
import { DecimalPipe } from '@angular/common';

@Component({
  selector: 'ui-change-indicator',
  imports: [DecimalPipe],
  template: `
    <div class="flex items-center gap-1 font-bold" [class]="colorClass()">
      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        @if (isPositive()) {
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 10l7-7m0 0l7 7m-7-7v18" />
        } @else {
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
        }
      </svg>
      <span>{{ Math.abs(value()) | number:'1.0-1' }}%</span>
    </div>
  `,
  styles: ``,
})
export class ChangeIndicatorComponent {
  value = input.required<number>();
  Math = Math;

  isPositive() {
    return this.value() >= 0;
  }

  colorClass() {
    return this.isPositive() ? 'text-success' : 'text-error';
  }
}

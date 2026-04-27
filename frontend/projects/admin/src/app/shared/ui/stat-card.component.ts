import { Component, input, computed } from '@angular/core';
import { DecimalPipe } from '@angular/common';

@Component({
  selector: 'ui-stat-card',
  imports: [DecimalPipe],
  template: `
    <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-5 flex items-center gap-4">
      @if (icon()) {
        <div class="flex items-center justify-center w-14 h-14 bg-gray-100 rounded-lg shrink-0">
          <img [src]="icon()" [alt]="label()" class="w-7 h-7" />
        </div>
      }
      <div class="flex flex-col min-w-0">
        <span class="text-3xl font-black leading-none truncate">
          @if (isNumeric()) {
            {{ value() | number }}
          } @else {
            {{ value() }}
          }
        </span>
        <span class="text-sm text-gray-500 mt-1">{{ label() }}</span>
      </div>
    </div>
  `,
  styles: ``,
})
export class StatCardComponent {
  label = input.required<string>();
  value = input.required<number | string>();
  icon = input<string>();

  isNumeric = computed(() => typeof this.value() === 'number');
}

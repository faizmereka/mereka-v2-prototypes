import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'ui-card',
  imports: [CommonModule],
  template: `
    <div [class]="cardClasses">
      <!-- Card Header -->
      @if (title || showHeader) {
        <div class="px-6 py-4 border-b border-gray-200">
          @if (title) {
            <h3 class="text-lg font-semibold text-gray-900">{{ title }}</h3>
          }
          @if (subtitle) {
            <p class="mt-1 text-sm text-gray-500">{{ subtitle }}</p>
          }
          <ng-content select="[cardHeader]"></ng-content>
        </div>
      }

      <!-- Card Body -->
      <div [class]="bodyClasses">
        <ng-content></ng-content>
      </div>

      <!-- Card Footer -->
      @if (showFooter) {
        <div class="px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-xl">
          <ng-content select="[cardFooter]"></ng-content>
        </div>
      }
    </div>
  `,
})
export class UiCardComponent {
  @Input() title = '';
  @Input() subtitle = '';
  @Input() showHeader = false;
  @Input() showFooter = false;
  @Input() noPadding = false;
  @Input() hover = false;
  @Input() clickable = false;

  get cardClasses(): string {
    const base = 'bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden';
    const hover = this.hover ? 'hover:shadow-md transition-shadow duration-200' : '';
    const clickable = this.clickable ? 'cursor-pointer' : '';
    return `${base} ${hover} ${clickable}`;
  }

  get bodyClasses(): string {
    return this.noPadding ? '' : 'p-6';
  }
}

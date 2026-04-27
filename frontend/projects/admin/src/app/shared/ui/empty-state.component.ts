import { Component, input } from '@angular/core';

@Component({
  selector: 'ui-empty-state',
  template: `
    <div class="flex flex-col items-center justify-center py-12 px-4 text-center">
      @if (icon()) {
        <div class="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
          <svg class="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" [attr.d]="icon()" />
          </svg>
        </div>
      }
      <h3 class="text-lg font-semibold text-gray-900 mb-2">
        {{ title() }}
      </h3>
      @if (description()) {
        <p class="text-sm text-gray-500 max-w-sm">
          {{ description() }}
        </p>
      }
      @if (action()) {
        <div class="mt-6">
          <ng-content></ng-content>
        </div>
      }
    </div>
  `,
  styles: ``,
})
export class EmptyStateComponent {
  title = input.required<string>();
  description = input<string>();
  icon = input<string>();
  action = input<boolean>(false);
}

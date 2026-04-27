import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'ui-page-header',
  imports: [RouterLink],
  template: `
    <div class="bg-white border-b border-gray-200 px-6 py-4 sticky top-0 z-10">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-4">
          @if (backLink()) {
            <a [routerLink]="backLink()" class="text-gray-600 hover:text-gray-900 transition-colors">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
              </svg>
            </a>
          }
          <div>
            <h1 class="text-2xl font-bold text-gray-900">
              <ng-content></ng-content>
            </h1>
            @if (subtitle()) {
              <p class="text-sm text-gray-500 mt-1">{{ subtitle() }}</p>
            }
          </div>
        </div>
        @if (actions()) {
          <div class="flex gap-3">
            <ng-content select="[actions]"></ng-content>
          </div>
        }
      </div>
    </div>
  `,
  styles: ``,
})
export class PageHeaderComponent {
  backLink = input<string>();
  subtitle = input<string>();
  actions = input<boolean>(false);
}

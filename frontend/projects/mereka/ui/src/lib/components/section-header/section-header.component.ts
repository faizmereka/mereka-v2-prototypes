import { Component, input } from '@angular/core';

@Component({
  selector: 'ui-section-header',
  template: `
    <div class="flex items-center justify-between mb-5">
      <h2 class="text-xl font-bold text-gray-900">
        <ng-content></ng-content>
      </h2>
      @if (action()) {
        <div class="flex-shrink-0">
          <ng-content select="[action]"></ng-content>
        </div>
      }
    </div>
  `,
  styles: ``,
})
export class SectionHeaderComponent {
  action = input<boolean>(false);
}

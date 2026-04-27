import { Component, Input, booleanAttribute } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'ui-form-label',
  imports: [CommonModule],
  template: `
    <label class="block text-sm font-semibold text-neutral-900 mb-1.5">
      <ng-content></ng-content>
      @if (required) {
        <span class="text-red-500 ml-0.5">*</span>
      }
    </label>
  `,
})
export class UiFormLabelComponent {
  @Input({ transform: booleanAttribute }) required = false;
}

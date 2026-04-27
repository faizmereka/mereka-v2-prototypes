import { Component } from '@angular/core';

@Component({
  selector: 'ui-form-hint',
  template: `<p class="text-sm text-neutral-500 mb-2"><ng-content></ng-content></p>`,
})
export class UiFormHintComponent {}

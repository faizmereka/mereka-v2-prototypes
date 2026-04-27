import { Component } from '@angular/core';

@Component({
  selector: 'ui-form-error',
  template: `<p class="mt-1.5 text-sm text-red-600"><ng-content></ng-content></p>`,
})
export class UiFormErrorComponent {}

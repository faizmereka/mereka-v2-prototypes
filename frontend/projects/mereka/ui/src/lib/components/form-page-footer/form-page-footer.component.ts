import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'ui-form-page-footer',
  imports: [CommonModule],
  templateUrl: './form-page-footer.component.html',
  host: {
    class: 'block flex-shrink-0',
  },
})
export class UiFormPageFooterComponent {}

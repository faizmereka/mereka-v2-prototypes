import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'ui-form-page-header',
  imports: [CommonModule],
  templateUrl: './form-page-header.component.html',
  host: {
    class: 'block flex-shrink-0',
  },
})
export class UiFormPageHeaderComponent {}

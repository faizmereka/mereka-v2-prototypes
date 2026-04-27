import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'ui-form-page-body',
  imports: [CommonModule],
  templateUrl: './form-page-body.component.html',
  host: {
    class: 'block flex-1 min-h-0 overflow-y-auto',
  },
})
export class UiFormPageBodyComponent {
  @Input() containerClass = '';
}

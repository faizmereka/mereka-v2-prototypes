import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'ui-form-page',
  imports: [CommonModule],
  templateUrl: './form-page.component.html',
  host: {
    class: 'block h-screen',
  },
})
export class UiFormPageComponent {}

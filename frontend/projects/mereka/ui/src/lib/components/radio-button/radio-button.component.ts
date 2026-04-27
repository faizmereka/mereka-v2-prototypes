import { Component, Input, booleanAttribute } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'ui-radio-button',
  imports: [CommonModule],
  templateUrl: './radio-button.component.html',
})
export class UiRadioButtonComponent<T> {
  @Input() value!: T;
  @Input({ transform: booleanAttribute }) checked = false;
  @Input({ transform: booleanAttribute }) disabled = false;
}

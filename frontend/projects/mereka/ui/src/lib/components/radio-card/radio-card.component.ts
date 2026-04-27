import { Component, Input, Output, EventEmitter, booleanAttribute } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'ui-radio-card',
  imports: [CommonModule],
  templateUrl: './radio-card.component.html',
})
export class UiRadioCardComponent<T> {
  @Input() value!: T;
  @Input({ transform: booleanAttribute }) checked = false;
  @Input({ transform: booleanAttribute }) disabled = false;
  @Input({ transform: booleanAttribute }) recommended = false;
  @Output() selected = new EventEmitter<T>();

  select() {
    if (!this.disabled) {
      this.selected.emit(this.value);
    }
  }
}

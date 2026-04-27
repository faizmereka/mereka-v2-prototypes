import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'ui-chip',
  imports: [CommonModule],
  templateUrl: './chip.component.html',
})
export class UiChipComponent {
  @Input() variant: 'primary' | 'default' | 'success' = 'default';
  @Input() removable = false;
  @Output() remove = new EventEmitter<void>();
}

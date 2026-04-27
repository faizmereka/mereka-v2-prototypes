import { Component, Input, booleanAttribute } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'ui-panel-row',
  imports: [CommonModule],
  templateUrl: './panel-row.component.html',
})
export class UiPanelRowComponent {
  @Input({ transform: booleanAttribute }) last = false;
}

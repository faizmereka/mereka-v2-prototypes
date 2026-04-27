import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'ui-panel',
  imports: [CommonModule],
  templateUrl: './panel.component.html',
})
export class UiPanelComponent {
  @Input() containerClass = '';
}

import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'ui-character-count',
  imports: [CommonModule],
  templateUrl: './character-count.component.html',
})
export class UiCharacterCountComponent {
  @Input() current = 0;
  @Input() max = 100;
}

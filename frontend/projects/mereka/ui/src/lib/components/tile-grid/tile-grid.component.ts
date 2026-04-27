import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'ui-tile-grid',
  imports: [CommonModule],
  templateUrl: './tile-grid.component.html',
})
export class UiTileGridComponent {
  @Input() columns: 2 | 3 | 4 = 3;

  get gridClasses(): string {
    const colMap = {
      2: 'grid-cols-2',
      3: 'grid-cols-2 sm:grid-cols-3',
      4: 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4',
    };
    return colMap[this.columns];
  }
}

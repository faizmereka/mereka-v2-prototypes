import { Component } from '@angular/core';

@Component({
  selector: 'ui-panel-row-title',
  template: `<h4 class="text-base font-medium text-gray-800 mb-1"><ng-content></ng-content></h4>`,
})
export class UiPanelRowTitleComponent {}

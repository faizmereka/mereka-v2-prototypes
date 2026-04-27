import { Component } from '@angular/core';

@Component({
  selector: 'ui-panel-sidebar-title',
  template: `<div class="flex items-center gap-2 text-sm font-medium text-gray-700 mb-3"><ng-content></ng-content></div>`,
})
export class UiPanelSidebarTitleComponent {}

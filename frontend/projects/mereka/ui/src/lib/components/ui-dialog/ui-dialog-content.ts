/* eslint-disable @angular-eslint/component-class-suffix */
/*
 * IMPORTANT:
 * This UI component is intentionally self-contained for modularity and reusability purposes.
 * Please refrain from introducing external dependencies or altering its encapsulation.
 * Ensure any modifications preserve its standalone nature. Consult with the team for any changes
 * that might impact its self-contained design.
 */
import { ChangeDetectionStrategy, Component, ViewEncapsulation, inject } from '@angular/core';
import { UIDialogService } from './ui-dialog.service';

@Component({
  selector: 'ui-dialog-content, [ui-dialog-content]',
  template: `<div class="ui-dialog-content-inner"><ng-content></ng-content></div>`,
  styleUrl: './ui-dialog-content.scss',
  host: {
    'class': 'ui-dialog-content',
    '[class.ui-dialog-content--no-actions]': '!uiDialogService.hasActions'
  },
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [UIDialogService],
})
export class UIDialogContent {

  protected readonly uiDialogService = inject(UIDialogService);
}

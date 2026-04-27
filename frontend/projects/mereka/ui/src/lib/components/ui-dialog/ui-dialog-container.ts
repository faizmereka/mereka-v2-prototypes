/* eslint-disable @angular-eslint/component-class-suffix */
/*
 * IMPORTANT:
 * This UI component is intentionally self-contained for modularity and reusability purposes.
 * Please refrain from introducing external dependencies or altering its encapsulation.
 * Ensure any modifications preserve its standalone nature. Consult with the team for any changes
 * that might impact its self-contained design.
 */
import { ChangeDetectionStrategy, Component, ViewEncapsulation } from '@angular/core';
import { UIDialogService } from './ui-dialog.service';

@Component({
  selector: 'ui-dialog-container, [ui-dialog-container]',
  template: `<ng-content></ng-content>`,
  styleUrl: './ui-dialog-container.scss',
  host: {
    'class': 'ui-dialog-container'
  },
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [UIDialogService],
})
export class UIDialogContainer {}

/* eslint-disable @angular-eslint/component-class-suffix, @typescript-eslint/no-explicit-any */
/*
 * IMPORTANT:
 * This UI component is intentionally self-contained for modularity and reusability purposes.
 * Please refrain from introducing external dependencies or altering its encapsulation.
 * Ensure any modifications preserve its standalone nature. Consult with the team for any changes
 * that might impact its self-contained design.
 */
import { ChangeDetectionStrategy, Component, ViewEncapsulation, input } from '@angular/core';
import { MatDrawer } from '@angular/material/sidenav';

@Component({
  selector: 'ui-sidenav-actions, [ui-sidenav-actions]',
  templateUrl: './ui-sidenav-actions.html',
  styleUrl: './ui-sidenav-actions.scss',
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    'class': 'ui-sidenav-actions',
  },
})
export class UISidenavActions {

  readonly drawer = input.required<MatDrawer>();
}

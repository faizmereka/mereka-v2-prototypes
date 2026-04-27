/* eslint-disable @angular-eslint/component-class-suffix */
/*
 * IMPORTANT:
 * This UI component is intentionally self-contained for modularity and reusability purposes.
 * Please refrain from introducing external dependencies or altering its encapsulation.
 * Ensure any modifications preserve its standalone nature. Consult with the team for any changes
 * that might impact its self-contained design.
 */
import { ChangeDetectionStrategy, Component, ViewEncapsulation } from '@angular/core';

@Component({
  selector: 'ui-sidenav-content, [ui-sidenav-content]',
  template: `<div class="ui-sidenav-content-inner"><ng-content></ng-content></div>`,
  styleUrl: './ui-sidenav-content.scss',
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    'class': 'ui-sidenav-content',
  },
})
export class UISidenavContent {}

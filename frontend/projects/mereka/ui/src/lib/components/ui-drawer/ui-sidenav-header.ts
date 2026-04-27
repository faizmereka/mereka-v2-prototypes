/* eslint-disable @angular-eslint/component-class-suffix, @typescript-eslint/no-explicit-any */
/*
 * IMPORTANT:
 * This UI component is intentionally self-contained for modularity and reusability purposes.
 * Please refrain from introducing external dependencies or altering its encapsulation.
 * Ensure any modifications preserve its standalone nature. Consult with the team for any changes
 * that might impact its self-contained design.
 */
import { ChangeDetectionStrategy, Component, ViewEncapsulation, input } from '@angular/core';
import { MatIcon } from '@angular/material/icon';
import { MatDrawer } from '@angular/material/sidenav';
import { UIButton } from '@mereka/ui/ui-button/ui-button';

@Component({
  selector: 'ui-sidenav-header, [ui-sidenav-header]',
  templateUrl: './ui-sidenav-header.html',
  styleUrl: './ui-sidenav-header.scss',
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    'class': 'ui-sidenav-header',
    '[class.ui-sidenav-header--disable-close]': 'disableClose()'
  },
  imports: [UIButton, MatIcon],
})
export class UISidenavHeader {

  readonly drawer = input.required<MatDrawer>();
  readonly disableClose = input<boolean>(false);

  onBackClick() {
    this.drawer()?.toggle();
  }
}

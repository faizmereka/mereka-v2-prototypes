/* eslint-disable @angular-eslint/component-class-suffix, @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars  */
/*
 * IMPORTANT:
 * This UI component is intentionally self-contained for modularity and reusability purposes.
 * Please refrain from introducing external dependencies or altering its encapsulation.
 * Ensure any modifications preserve its standalone nature. Consult with the team for any changes
 * that might impact its self-contained design.
 */
import { ChangeDetectionStrategy, Component, ViewEncapsulation } from '@angular/core';

@Component({
  selector: 'ui-profile-infobox, [ui-profile-infobox]',
  imports: [],
  templateUrl: './ui-profile-infobox.html',
  styleUrl: './ui-profile-infobox.scss',
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    'class': 'ui-profile-infobox',
  }
})
export class UIProfileInfobox {

}


@Component({
  selector: 'ui-profile-infobox-divider, [ui-profile-infobox-divider]',
  imports: [],
  template: '',
  styles: `
    .ui-profile-infobox-divider {
      height: 0;
      display: block;
      border-top: 1px solid #e0e0e0;
    }
  `,
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    'class': 'ui-profile-infobox-divider',
  }
})
export class UIProfileInfoboxDivider {

}

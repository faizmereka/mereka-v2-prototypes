/* eslint-disable @angular-eslint/component-class-suffix, @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars  */
/*
 * IMPORTANT:
 * This UI component is intentionally self-contained for modularity and reusability purposes.
 * Please refrain from introducing external dependencies or altering its encapsulation.
 * Ensure any modifications preserve its standalone nature. Consult with the team for any changes
 * that might impact its self-contained design.
 */
import { ChangeDetectionStrategy, Component, ViewEncapsulation, input } from '@angular/core';

@Component({
  selector: 'ui-operating-hours, [ui-operating-hours]',
  imports: [],
  templateUrl: './ui-operating-hours.html',
  styleUrl: './ui-operating-hours.scss',
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    'class': 'ui-operating-hours',
    '[attr.data-appearance]': 'appearance()',
  },
})
export class UIOperatingHours {

  readonly day = input<string>('');
  readonly time = input<string>('');
  readonly appearance = input<string>();
  readonly isToday = input<string>();
}
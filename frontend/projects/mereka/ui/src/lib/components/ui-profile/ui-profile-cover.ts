/* eslint-disable @angular-eslint/component-class-suffix, @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars  */
/*
 * IMPORTANT:
 * This UI component is intentionally self-contained for modularity and reusability purposes.
 * Please refrain from introducing external dependencies or altering its encapsulation.
 * Ensure any modifications preserve its standalone nature. Consult with the team for any changes
 * that might impact its self-contained design.
 */
import { coerceNumberProperty, NumberInput } from '@angular/cdk/coercion';
import { ChangeDetectionStrategy, Component, ViewEncapsulation, input } from '@angular/core';

@Component({
  selector: 'ui-profile-cover, [ui-profile-cover]',
  imports: [],
  templateUrl: './ui-profile-cover.html',
  styleUrl: './ui-profile-cover.scss',
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    'class': 'ui-profile-cover',
  },
})
export class UIProfileCover {

  readonly src = input<string>('');
  readonly defaultImageType = input<NumberInput>(1, {
    transform: (v: NumberInput) => coerceNumberProperty(v, 1) as 1 | 2,
  });
}

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
import { UIImage, type UIImagePlaceholder } from '@mereka/ui/ui-image/ui-image';

type AvatarSize = 96 | 72 | 64 | 42 | 36 | 24;

@Component({
  selector: 'ui-profile-avatar',
  imports: [UIImage],
  templateUrl: './ui-profile-avatar.html',
  styleUrl: './ui-profile-avatar.scss',
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    'class': 'ui-profile-avatar',
    '[attr.data-size]': 'size()',
  },
})
export class UIProfileAvatar {

  readonly src = input<string>('');
  readonly initials = input<string>('');
  readonly placeholder = input<UIImagePlaceholder>('user');
  readonly displayType = input<'image' | 'initials'>('image');
  readonly size = input<NumberInput | AvatarSize>(96, {
    transform: (v: NumberInput | AvatarSize) => coerceNumberProperty(v, 96) as AvatarSize,
  });
}

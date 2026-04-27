/* eslint-disable @angular-eslint/component-class-suffix, @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars  */
/*
 * IMPORTANT:
 * This UI component is intentionally self-contained for modularity and reusability purposes.
 * Please refrain from introducing external dependencies or altering its encapsulation.
 * Ensure any modifications preserve its standalone nature. Consult with the team for any changes
 * that might impact its self-contained design.
 */
import { ChangeDetectionStrategy, Component, ViewEncapsulation, input, output } from '@angular/core';
import { MatIcon } from '@angular/material/icon';
import { coerceBooleanProperty } from '@angular/cdk/coercion';
import { RouterModule } from '@angular/router';
import { UIAnchor, UIButton } from '@mereka/ui/ui-button/ui-button';
import { UIProfileAvatar } from './ui-profile-avatar';

@Component({
  selector: 'ui-profile-card, [ui-profile-card]',
  imports: [MatIcon, UIButton, UIAnchor, UIProfileAvatar, RouterModule],
  templateUrl: './ui-profile-card.html',
  styleUrl: './ui-profile-card.scss',
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    'class': 'ui-profile-card',
    '[class.ui-profile-card-user]': 'cardType() === "user"',
    '[class.ui-profile-card-hub]': 'cardType() === "business"',
    '[class.ui-profile-card--mobile-compact]': 'compactOnMobile()',
  },
})
export class UIProfileCard {

  readonly image = input<string>('');
  readonly id = input<string>('');
  readonly name = input<string>('');
  readonly title = input<string>('');
  readonly hubName = input<string>('');
  readonly hubSlug = input<string>('');
  readonly location = input<string>('');
  readonly email = input<string>('');
  readonly chatUrl = input<string>('');
  readonly contact = input<UIProfileCardContact>({});
  readonly rating = input<UIProfileRating>({ rating: 0, stars: 0 });
  readonly cardType = input<'user' | 'business'>('user');
  readonly compactOnMobile = input<boolean>(true);
  readonly hideElements = input<string[]>([]);
  readonly _isFavorite = input<boolean>(false, { alias: 'isFavorite' });
  get isFavorite(): boolean {
    return coerceBooleanProperty(this._isFavorite());
  }

  readonly favorite = output<boolean>();
  readonly chat = output<string>();

  toggleFavourite() {
    this.favorite.emit(!this.isFavorite);
  }

  messageClick() {
    this.chat.emit(this.id());
  }

  isEmpty(value: any): boolean {
    if (value === undefined || value === null || value === '') {
      return true;
    }

    if (Array.isArray(value) && value.length === 0) {
      return true;
    }

    return false;
  }
}


interface UIProfileCardContact {
  website?: string;
  linkedin?: string;
  facebook?: string;
  instagram?: string;
  twitter?: string;
  email?: string;
}

export interface UIProfileRating {
  rating: number;
  stars: number;
}
